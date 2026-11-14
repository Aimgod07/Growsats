import {beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import NotificationWelcome from './NotificationWelcome';
const state=vi.hoisted(()=>({signedIn:false,android:false,enable:vi.fn(),web:vi.fn(),permission:vi.fn()}));
vi.mock('../utils/api',()=>({isSignedIn:()=>state.signedIn}));
vi.mock('../utils/nativePush',()=>({isAndroidPush:()=>state.android,nativePushEnabled:()=>false,enableNativePush:state.enable}));
vi.mock('../utils/reminders',()=>({enableReminders:state.web,remindersEnabled:()=>false}));
vi.mock('@capacitor/push-notifications',()=>({PushNotifications:{requestPermissions:state.permission}}));
beforeEach(()=>{cleanup();localStorage.clear();vi.clearAllMocks();state.signedIn=false;state.android=false;state.enable.mockResolvedValue();state.web.mockResolvedValue();Object.defineProperty(window,'Notification',{configurable:true,value:{requestPermission:vi.fn().mockResolvedValue('granted')}});Object.defineProperty(window,'PushManager',{configurable:true,value:{}});Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{}});});
it('opens on first visit without requesting OS permission and remembers dismissal',()=>{
 const view=render(<NotificationWelcome/>);expect(screen.getByRole('dialog')).toBeTruthy();expect(Notification.requestPermission).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Not now'));view.unmount();render(<NotificationWelcome/>);expect(screen.queryByRole('dialog')).toBeNull();
});
it('requests permission on click and waits until login to register web push',async()=>{
 render(<NotificationWelcome/>);fireEvent.click(screen.getByText('Enable notifications'));await waitFor(()=>expect(localStorage.getItem('playloot.notification-welcome.v1')).toBe('pending'));expect(state.web).not.toHaveBeenCalled();state.signedIn=true;fireEvent(window,new Event('playloot:session-changed'));await waitFor(()=>expect(state.web).toHaveBeenCalledOnce());await waitFor(()=>expect(localStorage.getItem('playloot.notification-welcome.v1')).toBe('enabled'));
});
it('registers Android announcements after permission is granted',async()=>{
 state.android=true;state.signedIn=true;state.permission.mockResolvedValue({receive:'granted'});render(<NotificationWelcome/>);fireEvent.click(screen.getByText('Enable notifications'));await waitFor(()=>expect(state.enable).toHaveBeenCalledWith(false));expect(state.web).not.toHaveBeenCalled();
});
it('keeps a denied request dismissible without reporting success',async()=>{
 Notification.requestPermission.mockResolvedValue('denied');render(<NotificationWelcome/>);fireEvent.click(screen.getByText('Enable notifications'));await screen.findByRole('alert');expect(state.web).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Not now'));expect(screen.queryByRole('dialog')).toBeNull();
});
