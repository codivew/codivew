import type { VNode } from 'preact';
import type { ReviewRenderContext } from '../../reviews/types/review-renderer.js';
import {
  Empty,
  MetadataList,
  MetadataRow,
  PANEL_CLASSES,
  Panel,
  PanelHeading,
  formatDateTime,
} from './report-ui.js';

export function ReportFooter({ context }: { context: ReviewRenderContext }): VNode {
  const { result, filtered } = context;

  return (
    <div class="mt-8 grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
      <section id="recommended-tests" class={`${PANEL_CLASSES} scroll-mt-5`}>
        <PanelHeading>권장 테스트</PanelHeading>
        {result.tests.length === 0 ? (
          <Empty>권장 테스트가 없습니다.</Empty>
        ) : (
          <ul class="space-y-2.5">
            {result.tests.map((test) => (
              <li class="flex gap-3 rounded-xl bg-[var(--panel-subtle)] px-4 py-3" key={test}>
                <span class="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>{test}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Panel title="생성 정보">
        <MetadataList>
          <MetadataRow label="생성 시각" value={formatDateTime(context.createdAt)} />
          <MetadataRow label="처리 시간" value={`${(context.elapsedMs / 1000).toFixed(1)}초`} />
          <MetadataRow label="검토 범위" value={`${filtered.reviewedFiles.length}개 파일`} />
        </MetadataList>
      </Panel>
    </div>
  );
}
