export type LoginField = "email" | "fullName" | "hubId" | "regionId";

export type LoginActionState = {
  errors?: Partial<Record<LoginField, string[]>>;
  message?: string;
  status: "idle" | "error";
};

export const INITIAL_LOGIN_STATE: LoginActionState = {
  status: "idle",
};

export type AdminLoginField = "email" | "password";

export type AdminLoginActionState = {
  errors?: Partial<Record<AdminLoginField, string[]>>;
  message?: string;
  status: "idle" | "error";
};

export const INITIAL_ADMIN_LOGIN_STATE: AdminLoginActionState = {
  status: "idle",
};
