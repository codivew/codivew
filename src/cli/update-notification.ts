import type { NotifyOptions, Package, Settings } from 'update-notifier';

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
        'Codivew 새 버전이 있습니다: {currentVersion} → {latestVersion}',
        '업데이트: npm install -g {packageName}@latest',
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
