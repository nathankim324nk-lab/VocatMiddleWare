# voCat 단어 노트 — DB 편집 + Google Drive

voCat v86 SQLite DB를 브라우저에서 불러와 단어·뜻을 추가/수정하고, `.db`로 다운로드하거나 Google Drive의 기존 파일에 업로드합니다. Node.js 서버 없이 Render Static Site로 실행할 수 있습니다.

## 1. GitHub와 Render 배포

압축을 푼 뒤 `dist` 폴더와 이 README, 테스트 파일을 GitHub 저장소 최상위에 올립니다. ZIP 자체를 올리는 것이 아닙니다. 개인 DB나 OAuth Client Secret은 올리지 마세요.

Render에서 **New → Static Site**로 저장소를 연결합니다.

| 설정 | 값 |
|---|---|
| Branch | main (실제 기본 브랜치가 다르면 해당 브랜치) |
| Root Directory | 비워 두기 |
| Build Command | 비워 두기 (빌드 없는 정적 파일) |
| Publish Directory | dist |

배포 후 발급된 HTTPS 주소를 다음 Google 설정에 사용합니다. Web Service로 만들었다면 Static Site로 새로 만들어야 합니다. 이 프로젝트에는 서버 시작 명령이 없습니다.

## 2. Google Cloud 최초 설정

https://console.cloud.google.com/ 에서 프로젝트를 만들거나 선택합니다.

1. **Google Drive API**와 **Google Picker API**를 활성화합니다.
2. Google Auth Platform에서 앱 정보와 동의 화면을 구성합니다. 개인 Gmail 계정이면 External로 설정하고, 테스트 모드의 테스트 사용자에 실제 사용할 본인 이메일을 추가합니다.
3. OAuth 클라이언트를 **Web application** 유형으로 만듭니다.
4. **Authorized JavaScript origins**에 Render 주소의 원점(예: `https://your-app.onrender.com`)을 등록합니다. 경로와 마지막 `/`는 넣지 않습니다. 이 구현은 팝업 기반이므로 Redirect URI나 Client Secret을 사용하지 않습니다.
5. Picker용 **API Key**를 만듭니다. 웹사이트 제한에 `https://your-app.onrender.com/*`와 `https://docs.google.com/*`를 등록합니다. API 제한에는 Google Picker API와 Google Drive API를 지정합니다.
6. 프로젝트의 **숫자로 된 프로젝트 번호**를 확인합니다. 프로젝트 이름/문자열 ID와 다릅니다.
7. 배포한 사이트의 **Google Drive 연결 설정**에 Client ID, 제한된 API Key, 프로젝트 번호, 본인 Google 이메일을 입력하고 저장합니다. 이 값들은 현재 브라우저에만 저장됩니다.
8. **Google 로그인**에서 그 계정으로 승인 → **vocat 폴더 선택** → **Drive DB 불러오기**를 진행합니다. 폴더만 선택한다고 모든 하위 파일의 접근 권한이 생기는 것은 아니므로 DB 파일도 선택창에서 직접 선택합니다.

이메일을 입력하는 것만으로 Drive에 접속되지는 않습니다. Google이 발급한 OAuth 토큰과 사용자의 승인이 필요합니다. 토큰은 메모리에만 유지되며 만료되면 다시 로그인합니다. 계정이 설정한 이메일과 다르면 연결하지 않습니다. 비밀번호나 Client Secret을 이 앱에 입력하지 마세요.

## 3. 사용 순서

1. 모바일 voCat에서 Drive로 업로드합니다.
2. 웹에서 vocat 폴더의 DB를 불러옵니다. 로컬 `.db 불러오기`도 지원합니다.
3. 단어장을 선택하고 단어·뜻을 추가하거나 기존 항목을 수정합니다.
4. `.db 다운로드`로 복사본을 받거나, **Drive에 업로드**를 누릅니다.
5. 모바일 voCat에서 다운로드합니다.

Drive 업로드는 이 앱에서 Drive로 불러온 파일에만 가능합니다. 로컬 DB를 임의의 기존 Drive DB 위에 덮어쓰지 않습니다.

업로드 직전에 원본 버전과 체크섬을 확인하고, 같은 폴더에 `.bak` 백업을 만든 뒤 원본 파일 ID를 유지하며 내용을 교체합니다. 업로드 후 다시 읽어 SHA-256으로 내용을 비교합니다. 백업 생성 실패 또는 원본 변경 감지 시 교체하지 않습니다. 네트워크 실패로 업로드 결과가 불확실한 경우 자동 재시도하지 않고 다시 불러오도록 안내합니다.

**양쪽에서 동시에 수정하는 병합 기능은 없습니다.** 업로드 전 버전 확인과 교체 사이를 원자적으로 잠그지는 않으므로, 모바일 업로드와 웹 업로드를 동시에 진행하지 마세요. 수정 파일을 로컬로 내려받아 보관할 수도 있습니다.

## DB와 데이터 보존

- 첨부된 v86 DB 두 개로 추가/수정/내보내기/다시 열기를 검사했습니다.
- 기존 Corpus ID, 예문, 발음, 암기 상태, 퀴즈 및 다른 테이블과 `user_version=86`을 유지합니다.
- 단어장 `total`과 수정 시각을 갱신합니다. 새 단어의 학습 상태는 DB 기본값을 사용합니다.
- 새 ID는 샘플의 시간 기반 UUID v1 재배열 형식에 맞춰 생성합니다. 앱 내부 생성 코드를 확인한 것은 아니므로 모바일 복사본으로 새 단어 인식도 검증하세요.
- 학습 기록과 연결된 항목 보호를 위해 이 버전에는 삭제 기능이 없습니다.
- DB는 메모리에서 편집합니다. 새로고침/종료 전에 다운로드 또는 업로드하세요. 내보내기 다운로드의 실제 완료 여부를 브라우저에서 확인하세요.
- `.db 다운로드`는 Google Drive 파일을 변경하지 않습니다.
- 이전 노트 가져오기는 같은 사이트 주소에 저장된 이전 버전의 브라우저 노트를 현재 단어장에 추가합니다. 원래 노트는 지우지 않습니다.
- 단어장이 없는 DB, 다른 필수 필드가 추가된 DB, 30MB 초과 DB는 차단합니다.
- 이 배포물에 개인 DB와 Google 자격 정보는 포함되어 있지 않습니다.

## 개발 검증

Node.js가 있다면 다음과 같이 로컬 DB 복사본으로 테스트할 수 있습니다.

```sh
node test-db.cjs /absolute/path/to/vocat.db
node test-drive.cjs /absolute/path/to/vocat.db
```

두 번째 검사는 실제 Google 계정이 아닌 모의 Drive 응답으로 충돌 차단, 백업 실패 차단, 바이너리 업로드와 내용 검증, 계정 불일치 차단을 검사합니다. OAuth 로그인, Google Picker, 실제 Drive 업로드는 본인의 Google Cloud 설정 후 별도로 검증해야 합니다.

로컬 실행은 이 폴더에서 `python -m http.server 8000 --directory dist`를 실행하고 `http://localhost:8000`에 접속합니다. Google 로그인을 쓸 경우 이 원점도 Google OAuth 설정에 등록해야 합니다. HTML을 파일로 더블클릭하는 방식은 지원하지 않습니다.

## 참고와 라이선스

- Google Picker: https://developers.google.com/workspace/drive/picker/guides/web-picker
- Google OAuth token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- sql.js 1.13.0: https://github.com/sql-js/sql.js
- sql.js 라이선스는 dist/vendor/LICENSE-sql.js.txt에 포함합니다.
