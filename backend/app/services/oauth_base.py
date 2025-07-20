from abc import ABC, abstractmethod
from .. import schemas

class OAuth2ServiceBase(ABC):
    """모든 소셜 로그인 서비스의 기본 추상 클래스"""
    
    def __init__(self, provider_name: str):
        self.provider = provider_name

    @abstractmethod
    async def get_user_info(self, code: str, state: str | None = None) -> schemas.SocialUserProfile:
        """
        각 소셜 플랫폼의 인가 코드를 사용하여, 표준화된 사용자 프로필 정보를 반환합니다.
        이 메소드는 각 자식 클래스에서 반드시 구현해야 합니다.
        """
        pass