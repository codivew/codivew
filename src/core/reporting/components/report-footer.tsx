import type { VNode } from 'preact';
import { t } from '../../config/language.js';
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
        <PanelHeading>{t('report.recommendedTests')}</PanelHeading>
        {result.tests.length === 0 ? (
          <Empty>{t('report.noRecommendedTests')}</Empty>
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

      <Panel title={t('report.generationDetails')}>
        <MetadataList>
          <MetadataRow label={t('report.createdAt')} value={formatDateTime(context.createdAt)} />
          <MetadataRow
            label={t('report.elapsed')}
            value={t('common.seconds', { value: (context.elapsedMs / 1000).toFixed(1) })}
          />
          <MetadataRow
            label={t('report.reviewScope')}
            value={t('report.fileCount', { count: filtered.reviewedFiles.length })}
          />
        </MetadataList>
      </Panel>
    </div>
  );
}
