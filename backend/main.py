from fastapi import FastAPI

# FastAPI 애플리케이션 인스턴스 생성
app = FastAPI()

# 루트 경로 ("/")로 GET 요청이 오면 실행될 함수
@app.get("/")
def read_root():
    return {"message": "Cortex 백엔드 서버에 오신 것을 환영합니다!"}