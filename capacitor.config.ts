// Two Android apps from one project: APP=designer (default) → StitchBook Pro, APP=staff → StitchBook Staff.
import type { CapacitorConfig } from '@capacitor/cli';

const APP = (process.env.APP || 'designer') as 'designer' | 'staff';
const META = {
  designer: { id: 'com.stitchbook.designer', name: 'StitchBook Pro' },
  staff: { id: 'com.stitchbook.staff', name: 'StitchBook Staff' },
}[APP];

const config: CapacitorConfig = {
  appId: META.id,
  appName: META.name,
  webDir: `build/${APP}`,
  android: { path: `android-${APP}`, backgroundColor: '#0b0b0b' },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, launchAutoHide: true, backgroundColor: '#0b0b0b', showSpinner: false },
    StatusBar: { backgroundColor: '#0b0b0b', style: 'DARK' },
  },
};

export default config;
