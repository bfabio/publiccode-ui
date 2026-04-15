import { icon, library } from '@fortawesome/fontawesome-svg-core';
import {
  faCodeBranch,
  faGlobe,
  faBook,
  faFileCode,
  faGavel,
  faCircleInfo,
  faCube,
  faWrench,
  faDesktop,
  faLanguage,
  faListCheck,
  faImages,
  faAlignLeft,
  faAddressBook,
  faLayerGroup,
  faPalette,
} from '@fortawesome/free-solid-svg-icons';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';

library.add(
  faCodeBranch, faGlobe, faBook, faFileCode, faGavel, faCircleInfo,
  faCube, faWrench, faDesktop, faLanguage, faListCheck, faImages,
  faAlignLeft, faAddressBook, faLayerGroup, faPalette, faCalendar,
);

export function faIcon(name: string, prefix: 'fas' | 'far' = 'fas'): string {
  const i = icon({ prefix, iconName: name as never });
  return i ? i.html[0] : '';
}
