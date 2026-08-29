export type DemoProduct = {
  id: string;
  name: string;
  stock: number;
  price: number;
  category: string;
  status: "In stock" | "Low stock" | "Out of stock";
  updatedAt: string;
};

export type DemoCustomer = {
  id: string;
  name: string;
  phone: string;
  addedBy: string;
  dateAdded: string;
  status: "Active" | "Pending" | "VIP";
};

export type DemoOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  date: string;
  total: number;
  channel: "Repurchase" | "New registration" | "Retail";
  status: "Paid" | "Processing" | "Shipped" | "Pending";
};

export type DemoReport = {
  id: string;
  sentBy: string;
  sentTo: string;
  sentAt: string;
  totalOrders: number;
  totalRevenue: number;
  status: "Sent" | "Queued" | "Failed";
};

export type DemoActivity = {
  id: string;
  title: string;
  category: string;
  date: string;
  user: string;
  details: string;
};

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Sales" | "Finance" | "Support";
  status: "Active" | "Off duty";
  avatar: string;
};

export type DemoTrack = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  playlist: string;
};

export const defaultProducts: DemoProduct[] = [
  { id: "p-101", name: "B Comfort Capsules", stock: 28, price: 350, category: "Supplements", status: "In stock", updatedAt: "2026-08-27T09:00:00Z" },
  { id: "p-102", name: "Pain Vile Oil", stock: 15, price: 250, category: "Wellness", status: "Low stock", updatedAt: "2026-08-25T16:30:00Z" },
  { id: "p-103", name: "Vita PX", stock: 42, price: 400, category: "Nutrition", status: "In stock", updatedAt: "2026-08-26T11:15:00Z" },
  { id: "p-104", name: "Horite Eye Drop", stock: 4, price: 250, category: "Personal care", status: "Low stock", updatedAt: "2026-08-24T08:10:00Z" },
  { id: "p-105", name: "Soft Lax", stock: 0, price: 350, category: "Digestive", status: "Out of stock", updatedAt: "2026-08-22T14:20:00Z" },
  { id: "p-106", name: "Cushvite", stock: 19, price: 400, category: "Nutrition", status: "In stock", updatedAt: "2026-08-23T12:00:00Z" },
];

export const defaultCustomers: DemoCustomer[] = [
  { id: "c-101", name: "Grace Agyeman", phone: "024 123 9876", addedBy: "Boison", dateAdded: "2026-08-12", status: "VIP" },
  { id: "c-102", name: "Abdul Rahman", phone: "020 754 3001", addedBy: "Afoga", dateAdded: "2026-08-15", status: "Active" },
  { id: "c-103", name: "Martha Mensah", phone: "055 210 4455", addedBy: "Rosemond", dateAdded: "2026-08-18", status: "Pending" },
  { id: "c-104", name: "Thelma Amankwa", phone: "027 114 9080", addedBy: "Boison", dateAdded: "2026-08-21", status: "Active" },
];

export const defaultOrders: DemoOrder[] = [
  { id: "o-1001", orderNumber: "EMD-240820-1001", customer: "Grace Agyeman", date: "2026-08-24T10:30:00Z", total: 2200, channel: "Repurchase", status: "Paid" },
  { id: "o-1002", orderNumber: "EMD-240820-1002", customer: "Abdul Rahman", date: "2026-08-24T12:15:00Z", total: 1500, channel: "New registration", status: "Processing" },
  { id: "o-1003", orderNumber: "EMD-240820-1003", customer: "Martha Mensah", date: "2026-08-25T08:45:00Z", total: 1200, channel: "Retail", status: "Shipped" },
  { id: "o-1004", orderNumber: "EMD-240820-1004", customer: "Thelma Amankwa", date: "2026-08-25T14:00:00Z", total: 1850, channel: "Repurchase", status: "Pending" },
  { id: "o-1005", orderNumber: "EMD-250820-1005", customer: "Kwame Boateng", date: "2026-08-25T18:10:00Z", total: 2600, channel: "New registration", status: "Paid" },
];

export const defaultReports: DemoReport[] = [
  { id: "RPT-1284", sentBy: "Boison", sentTo: "Main Admin", sentAt: "2026-08-28T09:00:00Z", totalOrders: 48, totalRevenue: 39800, status: "Sent" },
  { id: "RPT-1285", sentBy: "Afoga", sentTo: "Operations", sentAt: "2026-08-27T10:45:00Z", totalOrders: 37, totalRevenue: 28500, status: "Queued" },
  { id: "RPT-1286", sentBy: "Rosemond", sentTo: "Finance", sentAt: "2026-08-26T08:20:00Z", totalOrders: 25, totalRevenue: 19450, status: "Sent" },
];

export const defaultActivities: DemoActivity[] = [
  { id: "a-1", title: "Daily sales check-in", category: "Ops", date: "2026-08-29T08:00:00Z", user: "Boison", details: "Reviewed stock movement and top seller list." },
  { id: "a-2", title: "New customer onboarding", category: "Sales", date: "2026-08-28T13:40:00Z", user: "Afoga", details: "Added three new retail buyers and queued packaging." },
  { id: "a-3", title: "Restock approved", category: "Inventory", date: "2026-08-27T09:15:00Z", user: "Rosemond", details: "Approved replenishment for low-stock wellness items." },
  { id: "a-4", title: "Referral campaign push", category: "Marketing", date: "2026-08-25T16:10:00Z", user: "Boison", details: "Updated referral script for customer retention." },
  { id: "a-5", title: "Backup validation", category: "Admin", date: "2026-08-24T17:25:00Z", user: "Boison", details: "Verified export and restore workflow completed successfully." },
];

export const defaultUsers: DemoUser[] = [
  { id: "u-1", name: "Boison", email: "boison@emd.com", role: "Admin", status: "Active", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" },
  { id: "u-2", name: "Afoga", email: "afoga@emd.com", role: "Sales", status: "Active", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80" },
  { id: "u-3", name: "Rosemond", email: "rosemond@emd.com", role: "Sales", status: "Off duty", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" },
  { id: "u-4", name: "Finance Team", email: "finance@emd.com", role: "Finance", status: "Active", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80" },
];

export const defaultTracks: DemoTrack[] = [
  { id: "t-1", title: "Morning Hustle", artist: "The Mix Desk", duration: "3:42", playlist: "Sales Flow" },
  { id: "t-2", title: "Momentum Drive", artist: "Urban Pulse", duration: "4:05", playlist: "Warehouse" },
  { id: "t-3", title: "Blue Hours", artist: "Aurora Coast", duration: "3:18", playlist: "Focus" },
];

export function readLocalCollection<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalCollection<T>(key: string, value: T[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}
