import type { NotifyOptions, Package, Settings } from 'update-notifier';
import { t } from '../config/language.js';

const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

type Notifier = { notify(options?: NotifyOptions): void };

export type UpdateNotifierFactory = (settings: Settings) => Notifier | Promise<Notifier>;

export async function scheduleUpdateNotification(
  pkg: Package,
  createNotifier: UpdateNotifierFactory = loadUpdateNotifier,
): Promise<void> {
  try {
    const notifier = await createNotifier({
      pkg,
      distTag: 'latest',
      updateCheckInterval: UPDATE_CHECK_INTERVAL_MS,
    });
    notifier.notify({
      defer: true,
      message: [
        t('update.available', {
          currentVersion: '{currentVersion}',
          latestVersion: '{latestVersion}',
        }),
        t('update.command', { packageName: '{packageName}' }),
      ].join('\n'),
    });
  } catch {
    // 업데이트 확인 실패가 CLI의 본래 실행을 방해해서는 안 됩니다.
  }
}

async function loadUpdateNotifier(settings: Settings): Promise<Notifier> {
  const { default: updateNotifier } = await import('update-notifier');
  return updateNotifier(settings);
}
