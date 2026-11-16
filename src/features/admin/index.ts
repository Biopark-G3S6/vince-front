export { AdminShell } from './components/AdminShell';
export { PageScaffold } from './components/PageScaffold';
export { ShellSlotsProvider } from './components/ShellSlots';
export {
  authenticateDemoUser,
  demoAccounts,
  demoUsers,
  useAuthenticatedUser,
  useCurrentUser,
  useSignIn,
  useSignOut,
  identityToUser,
  type BackendIdentity,
  type DemoUser,
  type Role,
} from './model/persona';
export {
  canAccessSection,
  canAccessUserSection,
  sectionsForRole,
  type AdminSection,
} from './model/accessPolicy';
export { PersonaSwitch } from './components/PersonaSwitch';
