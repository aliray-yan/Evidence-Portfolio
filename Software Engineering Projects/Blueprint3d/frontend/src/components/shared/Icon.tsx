type IconName = 'home' | 'grid' | 'cube' | 'arrow' | 'plus' | 'upload' | 'layers' | 'check' | 'download' | 'play' | 'camera' | 'video' | 'search' | 'close';
const paths: Record<IconName, string> = {
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  cube: 'm12 3 9 5v9l-9 5-9-5V8Z M3 8l9 5 9-5 M12 13v9 M7.5 5.5l9 5',
  arrow: 'M4 12h16 M14 6l6 6-6 6', plus: 'M12 5v14 M5 12h14',
  upload: 'M12 16V3 M7 8l5-5 5 5 M4 15v5h16v-5',
  layers: 'm12 3 10 5-10 5L2 8Z M2 12l10 5 10-5 M2 16l10 5 10-5',
  check: 'm5 12 4 4L19 6', download: 'M12 3v13 M7 11l5 5 5-5 M4 17v4h16v-4',
  play: 'm8 4 13 8-13 8Z', camera: 'M3 7h4l2-3h6l2 3h4v14H3Z M16 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  video: 'M3 5h12v14H3Z M15 10l6-4v12l-6-4', search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0 M15 15l6 6', close: 'M6 6l12 12 M6 18 18 6',
};
export function Icon({ name, size = 20 }: {
  name: IconName;
  size?: number;
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
