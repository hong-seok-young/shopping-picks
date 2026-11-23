"""Decide whether two Musinsa listings are the same garment in another color (reviews may be shared) or a different product."""
import re

COLOR = set('''black white grey gray navy beige khaki charcoal brown olive ivory cream oatmeal melange sand camel mocha wine burgundy
green blue red pink purple yellow orange mint sky indigo stone ecru mustard sage gunmetal cocoa dust polar off light dark deep warm cool
heather burnt ash moss iron wonder alumina whitecap dutch
블랙 화이트 그레이 회색 검정 검정색 남색 네이비 베이지 카키 차콜 챠콜 브라운 올리브 아이보리 크림 멜란지 오트밀 샌드 카멜 모카 무스 와인 버건디
그린 블루 레드 핑크 퍼플 옐로우 오렌지 민트 소라 하늘 인디고 스톤 에크루 머스타드 세이지 건메탈 코코아 라이트 다크 딥 웜 쿨 애쉬 애쉬카키
다크그레이 딥그레이 라이트그레이 다크네이비 다크브라운 오프화이트 화이트오트밀 미디움인디고 연청 중청 진청 흑청 생지 알루미나 원더알루미나
원더화이트 아이언 모스우드 더치 웜샌드 레프리콘 블랙진 그레이쉬 연그레이 진그레이 먹색 곤색 흰색 회색'''.split())


def toks(name):
    s = re.sub(r'\[[^\]]*\]|\([^)]*\)', ' ', name.lower())
    out = []
    for t in re.findall(r'[0-9a-z가-힣.]+', s):
        if t in COLOR or (len(t) >= 6 and re.search(r'\d', t) and re.search(r'[a-z]', t)) or re.fullmatch(r'\d+(color|col|colors|종|컬러)?|(color|col|colors|컬러)', t):
            continue
        out.append(t)
    return out


def codes(name):
    return {t for t in re.findall(r'[A-Za-z]{2,}\d{3,}[A-Za-z0-9]*', name)}


def base(name):
    """listing name without its color suffix: 'X_블랙', 'X [블랙]', 'X (블랙)', 'X-블랙-', 'X / 블랙'"""
    s = re.sub(r'\[[^\]]*\]|\([^)]*\)', ' ', name)
    s = re.sub(r'\s*-\s*$', '', s.strip())
    s = re.sub(r'\s*(_|/| - |-)\s*[^_/\-]{1,20}$', '', s)
    return re.sub(r'\s+', ' ', s).strip().lower()


def same(a, b):
    if a == b:
        return True
    ba, bb = base(a), base(b)
    if ba and ba == bb and len(ba) >= 4:
        return True
    ca, cb = codes(a), codes(b)
    if ca and cb:
        # product codes like YHJK2269 / KC2618 decide it when both have one (strip a trailing color letter)
        na = {c.rstrip('ABCDEFGHIJKLMNOPQRSTUVWXYZ') or c for c in ca}
        nb = {c.rstrip('ABCDEFGHIJKLMNOPQRSTUVWXYZ') or c for c in cb}
        if na & nb:
            return True
    A, B = set(toks(a)) - {c.lower() for c in ca}, set(toks(b)) - {c.lower() for c in cb}
    if not A or not B:
        return False
    return len(A & B) / len(A | B) >= 0.8
