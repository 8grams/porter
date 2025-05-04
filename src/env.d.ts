declare namespace App {
  interface Locals {
    user?: {
      role: string;
      email: string;
      jti: string;
      iat: number;
      exp: number;
    };
  }
}
