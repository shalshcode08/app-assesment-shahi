export type LoginField = "email" | "fullName" | "hubId" | "regionId";

export type LoginActionState = {
  errors?: Partial<Record<LoginField, string[]>>;
  message?: string;
  status: "idle" | "error";
};

export const INITIAL_LOGIN_STATE: LoginActionState = {
  status: "idle",
};
