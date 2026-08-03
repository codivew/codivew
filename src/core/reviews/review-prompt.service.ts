import type { FilteredDiffResult } from './diff-filter.service.js';
import type { ReviewRequest } from './types/review-request.js';

export type ReviewPrompts = { system: string; user: string };

const SYSTEM_PROMPT = `너는 엄격하지만 불필요한 지적을 만들지 않는 시니어 코드 리뷰어다.
제공된 Git diff 안에서 확인할 수 있는 문제만 검토한다.
모든 설명은 한국어로 작성한다.
반드시 지정된 JSON 구조만 반환한다.

리뷰 원칙:
- 실제 버그 가능성이 있는 문제를 우선한다.
- 단순 취향이나 스타일 차이는 지적하지 않는다.
- diff로 확인할 수 없는 내용을 단정하지 않는다.
- 추측이 포함되면 confidence를 낮게 설정한다.
- 문제가 없으면 issues를 빈 배열로 반환한다.
- 억지로 지적 개수를 채우지 않는다.
- 변경되지 않은 코드 자체를 문제로 삼지 않는다.
- diff에 없는 파일명을 생성하지 않는다.
- 모든 피드백은 line을 반드시 포함한다.
- line과 endLine은 +++ 대상인 변경 후 파일의 실제 라인 번호를 사용한다.
- diff의 추가 또는 변경된 라인에 피드백을 연결한다.
- 같은 원인의 문제를 여러 건으로 중복 생성하지 않는다.
- 코드 전체를 다시 작성하지 않는다.

심각도:
- must_fix: 런타임 오류, 잘못된 비즈니스 로직, 데이터 손실, 보안 취약점, 경쟁 상태, 치명적인 성능 문제
- should_fix: 상태 동기화 오류, React Hook 의존성 오류, 타입 안정성 문제, 예외 처리 누락, 중요한 유지보수 문제, 중요한 테스트 누락
- suggestion: 선택적 리팩터링, 가독성, 중복 제거, 네이밍 개선

검토 항목: TypeScript 타입 안정성, React Hooks, stale closure, 불필요한 렌더링, Redux Toolkit,
RTK Query 캐시와 invalidation, 비동기 처리, race condition, null 및 undefined 처리, 오류 처리,
보안, 성능, 테스트 누락.`;

export class ReviewPromptService {
  build(dto: ReviewRequest, filtered: FilteredDiffResult): ReviewPrompts {
    return {
      system: SYSTEM_PROMPT,
      user: `다음 변경사항을 리뷰하고 지정된 JSON 스키마만 반환하세요.

Repository: ${dto.repository}
Base branch: ${dto.baseBranch ?? '(없음)'}
Mode: ${dto.mode}
Commit SHA: ${dto.commitSha ?? '(없음)'}
Project context:
${dto.projectContext?.map((item) => `- ${item}`).join('\n') ?? '(없음)'}
Reviewed files:
${filtered.reviewedFiles.map((file) => `- ${file}`).join('\n')}

Filtered diff:
${filtered.diff}`,
    };
  }

  buildRetry(dto: ReviewRequest, filtered: FilteredDiffResult, reason: string): ReviewPrompts {
    const prompts = this.build(dto, filtered);
    return {
      system: prompts.system,
      user: `${prompts.user}\n\n이전 응답의 검증 실패 요약: ${reason}\nJSON 스키마를 정확히 지켜 다시 응답하세요. 이전 응답 본문은 제공하지 않습니다.`,
    };
  }
}
