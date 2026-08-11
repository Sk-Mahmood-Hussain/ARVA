export type Role = 'ADMIN' | 'OFFICER' | 'FARMER';
export type UserStatus = 'ACTIVE' | 'BANNED' | 'PENDING';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  language: string;
  onboardingCompleted: boolean;
  phoneNumber?: string;
  profilePictureUrl?: string;
}

export interface Region {
  id: string;
  state: string;
  district: string;
  block: string;
  village: string;
}

export interface FarmerProfile {
  id: string;
  address: string;
  regionId: string;
  region: Region;
  landSize: number;
  soilType: string;
  irrigationType: string;
  primaryCrop: string;
  cropGrowthStage: string;
  assignedOfficerId: string | null;
  assignedOfficer?: {
    user: {
      name: string;
      email: string;
      phoneNumber: string | null;
    };
  } | null;
}

export interface OfficerProfile {
  id: string;
  regions: Region[];
}

export interface AdminProfile {
  id: string;
}
