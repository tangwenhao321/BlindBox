import { mergeLocaleModules } from "../../mergeLocale";
import enUS from "../en-US";
import address from "./address.json";
import addressManage from "./addressManage.json";
import appUpdate from "./appUpdate.json";
import boxDetails from "./boxDetails.json";
import contact from "./contact.json";
import fullVi from "./fullVi.json";
import patch from "./patch.json";
import uxEnhancements from "./uxEnhancements.json";
import marketVi from "./marketVi.json";
import validation from "./validation.json";
import vnpay from "./vnpay.json";
import sharePoster from "./sharePoster.json";
import mobileExtras from "./mobileExtras.json";
import paymentReturn from "./paymentReturn.json";
import spectator from "./spectator.json";
import login from "./login.json";
import settings from "./settings.json";
import profile from "./profile.json";
import revealOverlay from "./revealOverlay.json";
import teamLottery from "./teamLottery.json";

export default mergeLocaleModules(
  enUS,
  fullVi,
  boxDetails,
  patch,
  uxEnhancements,
  marketVi,
  address,
  addressManage,
  validation,
  contact,
  vnpay,
  sharePoster,
  mobileExtras,
  paymentReturn,
  spectator,
  appUpdate,
  login,
  settings,
  profile,
  revealOverlay,
  teamLottery,
) as Record<string, unknown>;
