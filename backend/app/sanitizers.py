# file: backend/app/sanitizers.py

import bleach
from bleach.linkifier import Linker

def sanitize_html(dirty_html: str) -> str:
    """
    사용자 입력값에서 허용되지 않은 HTML 태그와 속성을 제거하여 XSS 공격을 방어합니다.
    URL은 클릭 가능한 링크로 변환합니다.
    """
    # 허용할 기본 태그 목록 (필요에 따라 조절)
    allowed_tags = {'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li'}
    
    # 허용할 속성
    allowed_attrs = {}

    # 텍스트 내의 URL을 <a> 태그로 변환하는 linkify 콜백
    def set_link_attrs(attrs, new=False):
        attrs[(None, 'target')] = '_blank'
        attrs[(None, 'rel')] = 'nofollow noopener noreferrer'
        return attrs

    linker = Linker(callbacks=[set_link_attrs])
    
    # 1. 허용되지 않은 태그 제거
    cleaned_html = bleach.clean(
        dirty_html,
        tags=allowed_tags,
        attributes=allowed_attrs,
        strip=True
    )
    
    # 2. 텍스트 내 URL을 안전한 링크로 변환
    safe_html = linker.linkify(cleaned_html)
    
    return safe_html