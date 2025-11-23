# file: backend/scripts/autoscale.py
import os
import sys
import redis
import requests
# 프로젝트 루트를 경로에 추가하여 app 모듈을 임포트할 수 있게 함
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.config import settings
# --- 설정 (config.py에서 로드) ---
RENDER_API_KEY = settings.RENDER.RENDER_API_KEY
SERVICE_ID = settings.RENDER.RENDER_SERVICE_ID
REDIS_URL = settings.DB.REDIS_URL
# 스케일링 정책 설정
MAX_WORKERS = 5       # 최대 워커 수 (비용 제한)
MIN_WORKERS = 1       # 최소 워커 수
SCALE_UP_THRESHOLD = 10  # 대기 중인 작업이 이보다 많으면 증설
SCALE_DOWN_THRESHOLD = 0 # 대기 중인 작업이 이만큼이면 감축
def get_queue_length(redis_client, queue_name="cpu_bound_queue"):
    """Redis에서 큐의 길이를 조회합니다."""
    try:
        return redis_client.llen(queue_name)
    except Exception as e:
        print(f"Error connecting to Redis: {e}")
        return 0
def get_current_instances(headers):
    """Render API를 통해 현재 인스턴스 수를 조회합니다."""
    url = f"https://api.render.com/v1/services/{SERVICE_ID}"
    try:
        res = requests.get(url, headers=headers)
        res.raise_for_status()
        return res.json()['serviceDetails']['numInstances']
    except Exception as e:
        print(f"Error fetching service details: {e}")
        return None
def scale_service(headers, target_instances):
    """Render API를 통해 인스턴스 수를 조정합니다."""
    url = f"https://api.render.com/v1/services/{SERVICE_ID}/scale"
    data = {"numInstances": target_instances}
    try:
        res = requests.post(url, headers=headers, json=data)
        res.raise_for_status()
        print(f"Successfully scaled to {target_instances} instances.")
    except Exception as e:
        print(f"Error scaling service: {e}")
def main():
    # 설정 값 검증
    if not all([RENDER_API_KEY, SERVICE_ID, REDIS_URL]):
        print("Missing required settings (RENDER_API_KEY, RENDER_SERVICE_ID, REDIS_URL).")
        print("Please check your .env file or Render Environment Variables.")
        return
    r = redis.from_url(REDIS_URL)
    headers = {"Authorization": f"Bearer {RENDER_API_KEY}"}
    # 1. 상태 조회
    queue_len = get_queue_length(r)
    current_workers = get_current_instances(headers)
    if current_workers is None:
        return
    print(f"Current Status - Queue: {queue_len}, Workers: {current_workers}")
    # 2. 스케일링 로직
    target_workers = current_workers
    if queue_len > SCALE_UP_THRESHOLD:
        if current_workers < MAX_WORKERS:
            target_workers += 1
            print(f"Scaling UP: Queue({queue_len}) > Threshold({SCALE_UP_THRESHOLD})")
        else:
            print("Max workers reached. Cannot scale up.")
    
    elif queue_len == SCALE_DOWN_THRESHOLD:
        if current_workers > MIN_WORKERS:
            target_workers -= 1
            print(f"Scaling DOWN: Queue is empty.")
        else:
            print("Min workers reached. Cannot scale down.")
    # 3. 변경 사항 적용
    if target_workers != current_workers:
        scale_service(headers, target_workers)
    else:
        print("No scaling action required.")
if __name__ == "__main__":
    main()