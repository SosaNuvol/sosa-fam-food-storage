// Shapes returned by sosa-fam-api. Keep in step with its README endpoint table.

export type Role = 'Owner' | 'Adult' | 'Member' | 'Child';

export interface TokenResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface Membership {
  householdId: string;
  householdName: string;
  memberId: string;
  role: Role;
}

export interface Me {
  id: string;
  email: string;
  displayName: string | null;
  households: Membership[];
}

export interface Household {
  id: string;
  name: string;
  createdAt: string;
  myRole: Role;
}

export interface Member {
  id: string;
  userId: string;
  displayName: string;
  role: Role;
  joinedAt: string;
}

export interface CreatedInvite {
  id: string;
  code: string;
  role: Exclude<Role, 'Owner'>;
  expiresAt: string;
}

export const canManageMembers = (role: Role | undefined) => role === 'Owner' || role === 'Adult';

export interface Store {
  id: string;
  name: string;
}

export interface GroceryList {
  id: string;
  name: string;
  createdAt: string;
  archived: boolean;
  itemCount: number;
  openCount: number;
}

export interface GroceryItem {
  id: string;
  listId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  storeId: string | null;
  storeName: string | null;
  source: 'Manual' | 'LowStock';
  productId: string | null;
  isChecked: boolean;
  checkedByName: string | null;
  checkedAt: string | null;
  addedByName: string | null;
  createdAt: string;
}

export interface GroceryListDetail {
  list: GroceryList;
  items: GroceryItem[];
}

// ---- Food storage (pantry). Ids are Proxy-IDs such as "PAPR:31773:<guid>". ----

export type TrackingMode = 'Count' | 'Status';
export type StockStatus = 'Have' | 'Low' | 'Out';

export interface PantryLocation {
  id: string;
  name: string;
  trackingMode: TrackingMode;
  sortOrder: number;
}

export interface Stock {
  locationId: string;
  locationName: string;
  trackingMode: TrackingMode;
  quantity: number;
  status: StockStatus | null;
  updatedAt: string;
}

export interface Product {
  id: string;
  /** What grocery items carry in productId for this product. */
  groceryProductId: string;
  name: string;
  barcode: string | null;
  category: string | null;
  unit: string | null;
  minQuantity: number | null;
  targetQuantity: number | null;
  isStaple: boolean;
  storeId: string | null;
  storeName: string | null;
  imageUrl: string | null;
  /** Total across counted locations. */
  onHand: number;
  needsRestock: boolean;
  suggestedQuantity: number | null;
  stock: Stock[];
}

export interface ProductInput {
  name: string;
  barcode?: string | null;
  category?: string | null;
  unit?: string | null;
  minQuantity?: number | null;
  targetQuantity?: number | null;
  isStaple?: boolean;
  storeId?: string | null;
  imageUrl?: string | null;
}

export interface Need {
  product: Product;
  onOpenList: boolean;
}

export interface AddNeedsResult {
  added: number;
  alreadyOnList: number;
  items: GroceryItem[];
}

export interface Activity {
  productId: string;
  productName: string;
  locationName: string;
  changeType: 'Adjust' | 'Set' | 'MoveIn' | 'MoveOut' | 'PutAway' | 'Status';
  quantityBefore: number | null;
  quantityAfter: number | null;
  statusAfter: StockStatus | null;
  note: string | null;
  byName: string | null;
  at: string;
}
