export interface VaultEntry {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
  color: string;
}

export interface VaultList {
  vaults: VaultEntry[];
  lastActiveVault: string | null;
}
