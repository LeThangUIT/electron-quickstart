/**
 * TYPE-SAFE IPC DEFINITIONS FOR ELECTRON PRELOAD
 * Cung cấp IntelliSense và Type-Safe cho window.electronAPI trong toàn bộ mã nguồn React & TypeScript
 */

export interface SystemInfo {
  platform: string;
  osRelease: string;
  totalMemory: string;
  freeMemory: string;
  cpuModel: string;
  cpuCores: number;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  appVersion: string;
}

export interface AppSettings {
  username?: string;
  theme?: string;
  fontSize?: string;
  windowBounds?: {
    x?: number;
    y?: number;
    width: number;
    height: number;
  };
  savedTabs?: Array<{
    url: string;
    title: string;
    isDashboard?: boolean;
    isLocalTab?: boolean;
  }>;
  updatedAt?: string;
}

export interface TabData {
  id: number;
  url: string;
  title: string;
  isDashboard: boolean;
  isLocalTab?: boolean;
  isLoading?: boolean;
  isActive?: boolean;
}

export interface BroadcastMessagePayload {
  sender: string;
  text: string;
  timestamp: string;
}

export interface IElectronAPI {
  // Giai đoạn 1 & 2: System & Dialog
  getSystemInfo: () => Promise<SystemInfo>;
  sendPing: (message: string) => void;
  onPong: (callback: (data: string) => void) => () => void;
  getHeartbeat: () => Promise<string>;
  saveFile: (content: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  showNotification: (options: { title: string; body: string }) => Promise<{ success: boolean; error?: string }>;

  // Giai đoạn 3: Window Controls & Settings
  minimizeWindow: () => Promise<{ success: boolean }>;
  maximizeWindow: () => Promise<{ success: boolean; isMaximized: boolean }>;
  closeWindow: () => Promise<{ success: boolean }>;
  openSettings: () => Promise<{ success: boolean }>;
  closeSettings: () => Promise<{ success: boolean }>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<{ success: boolean; settings: AppSettings }>;
  onMaximizedState: (callback: (isMaximized: boolean) => void) => () => void;
  onSettingsChanged: (callback: (settings: AppSettings) => void) => () => void;

  // Giai đoạn 4: Multi-Tab & Broadcast
  createTab: (url?: string) => Promise<number>;
  switchTab: (tabId: number) => Promise<{ success: boolean }>;
  closeTab: (tabId: number) => Promise<{ success: boolean }>;
  navigateTab: (payload: { tabId?: number; action: 'goBack' | 'goForward' | 'reload' | 'loadURL'; url?: string }) => Promise<{ success: boolean }>;
  getTabsState: () => Promise<TabData[]>;
  onTabCreated: (callback: (data: TabData) => void) => () => void;
  onTabSwitched: (callback: (data: TabData) => void) => () => void;
  onTabUpdated: (callback: (data: TabData) => void) => () => void;
  onTabClosed: (callback: (data: { id: number }) => void) => () => void;
  onTabLoading: (callback: (data: { id: number; isLoading: boolean }) => void) => () => void;
  broadcastMessage: (message: string) => Promise<{ success: boolean; payload?: BroadcastMessagePayload }>;
  onBroadcastMessage: (callback: (payload: BroadcastMessagePayload) => void) => () => void;

  // Giai đoạn 6: Auto-Updater (electron-updater)
  checkForUpdates: () => Promise<{ success: boolean; isDev?: boolean; updateInfo?: any; error?: string }>;
  quitAndInstallUpdate: () => Promise<{ success: boolean }>;
  onUpdateChecking: (callback: () => void) => () => void;
  onUpdateAvailable: (callback: (info: { version: string; releaseDate?: string; releaseNotes?: string }) => void) => () => void;
  onUpdateNotAvailable: (callback: (info: { version: string }) => void) => () => void;
  onUpdateDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string; releaseDate?: string }) => void) => () => void;
  onUpdateError: (callback: (error: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}
