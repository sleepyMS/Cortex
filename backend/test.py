import secrets
import string

characters = string.ascii_letters + string.digits  # 대소문자 + 숫자
random_str = ''.join(secrets.choice(characters) for _ in range(32))
print(random_str)