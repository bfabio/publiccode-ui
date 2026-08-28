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
  faGear,
  faScaleBalanced,
  faChartPie,
  faCheck,
  faArrowUpRightFromSquare,
  faShieldHalved,
  faHeartPulse,
  faArrowsRotate,
  faLink,
} from '@fortawesome/free-solid-svg-icons';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import { faWindows, faApple, faLinux, faAndroid } from '@fortawesome/free-brands-svg-icons';

library.add(
  faCodeBranch, faGlobe, faBook, faFileCode, faGavel, faCircleInfo,
  faCube, faWrench, faDesktop, faLanguage, faListCheck, faImages,
  faAlignLeft, faAddressBook, faLayerGroup, faGear, faCalendar,
  faScaleBalanced, faChartPie, faCheck, faArrowUpRightFromSquare,
  faShieldHalved, faHeartPulse, faArrowsRotate, faLink,
  faWindows, faApple, faLinux, faAndroid,
);

export function faIcon(name: string, prefix: 'fas' | 'far' | 'fab' = 'fas'): string {
  const i = icon({ prefix, iconName: name as never });
  return i ? i.html[0] : '';
}
