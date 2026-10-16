import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  UiMode,
  UserPublic,
} from "@projectmaster/shared";
import { api, tokenStore } from "../api/client";

interface AuthState {
  user: UserPublic | null;
  status: "idle" | "loading" | "authenticated" | "error";
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: "idle",
  error: null,
};

type AuthResponse = { user: UserPublic; tokens: AuthTokens };

export const login = createAsyncThunk(
  "auth/login",
  async (body: LoginRequest) => {
    const res = await api.post<AuthResponse>("/auth/login", body);
    tokenStore.set(res.tokens);
    return res.user;
  },
);

export const register = createAsyncThunk(
  "auth/register",
  async (body: RegisterRequest) => {
    const res = await api.post<AuthResponse>("/auth/register", body);
    tokenStore.set(res.tokens);
    return res.user;
  },
);

export const guest = createAsyncThunk("auth/guest", async () => {
  const res = await api.post<AuthResponse>("/auth/guest");
  tokenStore.set(res.tokens);
  return res.user;
});

/** Compte de démonstration pré-rempli (voir la valeur en 10 s, sans config). */
export const demo = createAsyncThunk("auth/demo", async () => {
  const res = await api.post<AuthResponse>("/demo");
  tokenStore.set(res.tokens);
  return res.user;
});

export const upgrade = createAsyncThunk(
  "auth/upgrade",
  async (body: RegisterRequest) => {
    const res = await api.post<AuthResponse>("/auth/upgrade", body);
    tokenStore.set(res.tokens);
    return res.user;
  },
);

export const loadMe = createAsyncThunk("auth/me", async () => {
  return api.get<UserPublic>("/auth/me");
});

/** Change la préférence d'affichage (mode simple/expert) et la persiste. */
export const setUiMode = createAsyncThunk("auth/setUiMode", async (uiMode: UiMode) => {
  return api.patch<UserPublic>("/auth/me", { uiMode });
});

export const logout = createAsyncThunk("auth/logout", async () => {
  try {
    await api.post("/auth/logout");
  } finally {
    tokenStore.clear();
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(login.fulfilled, (s, a) => {
        s.status = "authenticated";
        s.user = a.payload;
      })
      .addCase(login.rejected, (s, a) => {
        s.status = "error";
        s.error = a.error.message ?? "Échec de connexion";
      })
      .addCase(register.fulfilled, (s, a) => {
        s.status = "authenticated";
        s.user = a.payload;
      })
      .addCase(register.rejected, (s, a) => {
        s.status = "error";
        s.error = a.error.message ?? "Échec d'inscription";
      })
      .addCase(demo.fulfilled, (s, a) => {
        s.status = "authenticated";
        s.user = a.payload;
        s.error = null;
      })
      .addCase(guest.fulfilled, (s, a) => {
        s.status = "authenticated";
        s.user = a.payload;
      })
      .addCase(upgrade.fulfilled, (s, a) => {
        s.status = "authenticated";
        s.user = a.payload;
      })
      .addCase(upgrade.rejected, (s, a) => {
        s.status = "error";
        s.error = a.error.message ?? "Échec de la création du compte";
      })
      .addCase(loadMe.fulfilled, (s, a) => {
        s.status = "authenticated";
        s.user = a.payload;
      })
      .addCase(setUiMode.fulfilled, (s, a) => {
        s.user = a.payload;
      })
      .addCase(loadMe.rejected, (s) => {
        s.status = "idle";
        s.user = null;
      })
      .addCase(logout.fulfilled, (s) => {
        s.status = "idle";
        s.user = null;
      });
  },
});

export default authSlice.reducer;
