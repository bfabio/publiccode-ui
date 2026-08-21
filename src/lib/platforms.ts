export interface PlatformIcon {
  name: string;
  prefix: 'fas' | 'fab';
}

export interface PlatformInfo {
  label: string;
  icon: PlatformIcon | null;
}

// The six enumerated values of the publiccode.yml `platforms` key. Any
// other value is free text per the spec and is shown verbatim.
const KNOWN: Record<string, PlatformInfo> = {
  web: { label: 'Web', icon: { name: 'globe', prefix: 'fas' } },
  windows: { label: 'Windows', icon: { name: 'windows', prefix: 'fab' } },
  mac: { label: 'macOS', icon: { name: 'apple', prefix: 'fab' } },
  linux: { label: 'Linux', icon: { name: 'linux', prefix: 'fab' } },
  ios: { label: 'iOS', icon: { name: 'apple', prefix: 'fab' } },
  android: { label: 'Android', icon: { name: 'android', prefix: 'fab' } },
};

export function describePlatform(value: string): PlatformInfo {
  return KNOWN[value.trim().toLowerCase()] ?? { label: value, icon: null };
}
