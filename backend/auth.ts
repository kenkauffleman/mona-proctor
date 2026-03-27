import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

export type AuthenticatedUser = {
  uid: string
  email?: string
}

export interface AuthVerifier {
  verifyIdToken(idToken: string): Promise<AuthenticatedUser>
}

export class FirebaseAdminAuthVerifier implements AuthVerifier {
  constructor(projectId: string) {
    if (getApps().length === 0) {
      initializeApp({ projectId })
    }
  }

  async verifyIdToken(idToken: string): Promise<AuthenticatedUser> {
    const decodedToken = await getAuth().verifyIdToken(idToken)

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    }
  }
}
