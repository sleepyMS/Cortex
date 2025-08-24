# file: (미래의) backend/app/notification_service/subscriber.py

# 이 코드는 별도의 프로세스로 실행됩니다.
def listen_for_backtest_events():
    pubsub = redis_client.pubsub()
    pubsub.subscribe("events:backtesting")

    for message in pubsub.listen():
        if message['type'] == 'message':
            event = json.loads(message['data'])
            if event['event_type'] == 'BacktestCompleted':
                user_id = event['payload']['user_id']
                # 여기에 사용자에게 이메일이나 푸시 알림을 보내는 로직을 구현
                send_email_notification(user_id, "Your backtest is complete!")