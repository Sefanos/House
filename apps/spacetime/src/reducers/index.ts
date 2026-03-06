import * as auth from "./auth/index.js";
import * as user from "./user/index.js";
import * as house from "./house/index.js";
import * as roles from "./roles/index.js";
import * as rooms from "./rooms/index.js";
import * as messages from "./messages/index.js";
import * as dms from "./dms/index.js";
import * as badges from "./badges/index.js";

export const reducers = {
  auth,
  user,
  house,
  roles,
  rooms,
  messages,
  dms,
  badges
};
