export enum KeyPurposes {
  MANAGEMENT_KEY = 1,
  ACTION_KEY,
  CLAIM_SIGNER_KEY,
  ENCRYPTION_KEY,
}

export enum KeyType {
  ECDSA = 1, // Elliptic Curve Digital Signature Algorithm
}

export enum ClaimSchemes {
  ECDSA = 1,
}

export enum ClaimTypes {
  KYC = 1,
}
