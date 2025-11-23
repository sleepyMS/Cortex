# file: backend/scripts/autoscale.py
import os
import sys
import time
import redis
import requests
import math
# 프로젝트 루트 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.config import settings
from app.celery_app import celery_app  # Celery 앱 임포트 (Active Task 확인용)
# --- 설정 ---
RENDER_API_KEY = settings.RENDER.RENDER_API_KEY
SERVICE_ID = settings.RENDER.RENDER_SERVICE_ID
REDIS_URL = settings.DB.REDIS_URL
# 정책 설정
MAX_WORKERS = 5
MIN_WORKERS = 0
TASKS_PER_WORKER = 1       # 워커 1개당 처리할 이상적인 작업 수
COOLDOWN_SECONDS = 600     # 10분간 작업이 없어야 다운스케일 (Flapping 방지)
SCALE_UP_STEP = 2          # 한 번에 늘릴 최대 워커 수 (급격한 증가 방지)
def get_redis_client():
    return redis.from_url(REDIS_URL)
def acquire_lock(r, lock_name="autoscale_lock", expire=50):
    """중복 실행 방지를 위한 Redis Lock"""
    return r.set(lock_name, "locked", ex=expire, nx=True)
def get_queue_length(r, queue_name="cpu_bound_queue"):
    try:
        return r.llen(queue_name)
    except Exception:
        return 0
def get_active_task_count():
    """현재 실행 중인 Celery 작업 수 조회 (장기 실행 작업 보호)"""
    try:
        i = celery_app.control.inspect()
        active = i.active()
        if not active:
            return 0
        
        # active 딕셔너리: {'worker1': [task1], 'worker2': []}
        count = 0
        for tasks in active.values():
            count += len(tasks)
        return count
    except Exception as e:
        print(f"[Warning] Failed to inspect active tasks: {e}")
        # 검사 실패 시 안전을 위해 작업이 있다고 가정할 수도 있으나,
        # 여기서는 0으로 처리하고 큐 길이로만 판단하도록 함
        return 0
def get_current_instances(headers):
    url = f"https://api.render.com/v1/services/{SERVICE_ID}"
    try:
        res = requests.get(url, headers=headers)
        res.raise_for_status()
        return res.json()['serviceDetails']['numInstances']
    except Exception as e:
        print(f"[Error] Fetch instances: {e}")
        return None
def update_activity_timestamp(r, is_busy):
    """작업(큐 대기 or 실행 중)이 있으면 현재 시간을 Redis에 기록"""
    key = "cpu_worker_last_active"
    if is_busy:
        r.set(key, time.time())
        return time.time()
    
    # 작업이 없으면 마지막 기록 시간 조회
    last_active = r.get(key)
    return float(last_active) if last_active else 0
def calculate_target(current, queue_len, active_count, last_active_time):
    """목표 워커 수 계산"""
    
    total_load = queue_len + active_count
    
    # 1. Scale Up 로직 (대기 중인 작업이 있거나, 모든 워커가 바쁠 때)
    if queue_len > 0:
        # 필요한 추가 워커 수 계산
        needed = math.ceil(queue_len / TASKS_PER_WORKER)
        # 현재 실행 중인 것 외에 추가로 필요한 만큼 더하기
        target = min(current + needed, MAX_WORKERS)
        # 한 번에 너무 많이 늘리지 않도록 제한
        if target - current > SCALE_UP_STEP:
            target = current + SCALE_UP_STEP
            
        return max(target, current)
    # 2. Scale Down 로직 (큐 == 0)
    # 중요: 실행 중인 작업(active_count)이 있으면 절대 줄이지 않음
    if active_count > 0:
        print(f"Active tasks running ({active_count}). Keeping workers.")
        return current
    # 큐도 비었고, 실행 중인 작업도 없음 -> 쿨다운 체크
    now = time.time()
    if now - last_active_time > COOLDOWN_SECONDS:
        return MIN_WORKERS
    else:
        print(f"Cooldown active. ({int(now - last_active_time)}s / {COOLDOWN_SECONDS}s)")
        return current
def scale_service(headers, target):
    url = f"https://api.render.com/v1/services/{SERVICE_ID}/scale"
    try:
        requests.post(url, headers=headers, json={"numInstances": target})
        print(f"Scaled to {target} instances.")
    except Exception as e:
        print(f"[Error] Scale service: {e}")
def main():
    if not all([RENDER_API_KEY, SERVICE_ID, REDIS_URL]):
        print("Missing settings.")
        return
    r = get_redis_client()
    
    if not acquire_lock(r):
        print("Script already running.")
        return
    headers = {"Authorization": f"Bearer {RENDER_API_KEY}"}
    # 1. 상태 조회
    queue_len = get_queue_length(r)
    active_count = get_active_task_count()
    current = get_current_instances(headers)
    
    if current is None:
        return
    # 2. 바쁜 상태인지 확인 (큐에 있거나 실행 중이거나)
    is_busy = (queue_len > 0) or (active_count > 0)
    last_active = update_activity_timestamp(r, is_busy)
    # 3. 목표 계산
    target = calculate_target(current, queue_len, active_count, last_active)
    print(f"Status: Queue={queue_len}, Active={active_count}, Current={current} -> Target={target}")
    # 4. 적용
    if target != current:
        scale_service(headers, target)
    else:
        print("No change needed.")
if __name__ == "__main__":
    main()