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
  faShieldHalved,
  faHeartPulse,
  faArrowsRotate,
  faUnlock,
  faLink,
} from '@fortawesome/free-solid-svg-icons';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';

library.add(
  faCodeBranch, faGlobe, faBook, faFileCode, faGavel, faCircleInfo,
  faCube, faWrench, faDesktop, faLanguage, faListCheck, faImages,
  faAlignLeft, faAddressBook, faLayerGroup, faPalette, faCalendar,
  faShieldHalved, faHeartPulse, faArrowsRotate, faUnlock, faLink,
);

export function faIcon(name: string, prefix: 'fas' | 'far' = 'fas'): string {
  const i = icon({ prefix, iconName: name as never });
  return i ? i.html[0] : '';
}
