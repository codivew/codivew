import type { VNode } from 'preact';
import type { ReviewRenderContext } from '../../reviews/types/review-renderer.js';
import type { ReviewSeverity } from '../../reviews/types/review-result.js';
import {
  MetadataList,
  MetadataRow,
  OptionalMetadataRow,
  PanelHeading,
  SURFACE_BASE_CLASSES,
  SURFACE_CLASSES,
} from './report-ui.js';

const METRIC_CLASSES: Record<ReviewSeverity, string> = {
  must_fix: 'bg-[var(--must-soft)] text-[var(--must)]',
  should_fix: 'bg-[var(--should-soft)] text-[var(--should)]',
  suggestion: 'bg-[var(--suggest-soft)] text-[var(--suggest)]',
};

export function ReportOverview({ context }: { context: ReviewRenderContext }): VNode {
  const { result, request } = context;
  const counts = {
    must_fix: result.issues.filter((issue) => issue.severity === 'must_fix').length,
    should_fix: result.issues.filter((issue) => issue.severity === 'should_fix').length,
    suggestion: result.issues.filter((issue) => issue.severity === 'suggestion').length,
  };

  return (
    <>
      <section class={`${SURFACE_CLASSES} overflow-hidden`}>
        <div class="border-l-4 border-[var(--accent)] px-6 py-5 max-[700px]:px-4">
          <PanelHeading>리뷰 요약</PanelHeading>
          <p class="max-w-[900px] text-[17px]/7 font-medium tracking-[-0.01em] text-[var(--text)]">
            {result.summary}
          </p>
        </div>
      </section>

      <div class="overview-layout mb-8 grid grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] gap-4 max-[900px]:grid-cols-1">
        <section class={`${SURFACE_BASE_CLASSES} p-5 max-[700px]:p-4`}>
          <PanelHeading>이슈 현황</PanelHeading>
          <div class="grid grid-cols-3 gap-3 max-[700px]:gap-2">
            <Metric severity="must_fix" label="필수 수정" value={counts.must_fix} />
            <Metric severity="should_fix" label="수정 권장" value={counts.should_fix} />
            <Metric severity="suggestion" label="제안" value={counts.suggestion} />
          </div>
        </section>
        <section class={`${SURFACE_BASE_CLASSES} p-5 max-[700px]:p-4`}>
          <PanelHeading>변경 정보</PanelHeading>
          <MetadataList>
            <MetadataRow label="리뷰 ID" value={context.reviewId} mono />
            <OptionalMetadataRow label="기준 브랜치" value={request.baseBranch} mono />
            <OptionalMetadataRow label="커밋 SHA" value={request.commitSha} mono />
            <MetadataRow label="모델" value={context.model} />
          </MetadataList>
        </section>
      </div>
    </>
  );
}

function Metric({
  severity,
  label,
  value,
}: {
  severity: ReviewSeverity;
  label: string;
  value: number;
}): VNode {
  return (
    <div class={`metric rounded-xl px-4 py-3.5 max-[700px]:px-3 ${METRIC_CLASSES[severity]}`}>
      <div class="mb-2 flex items-center gap-2">
        <span class="size-1.5 rounded-full bg-current" />
        <span class="text-xs font-bold whitespace-nowrap">{label}</span>
      </div>
      <b class="block text-[26px]/7 tracking-[-0.04em]">{value}</b>
    </div>
  );
}
