import Controller from '@curveball/controller';
import { Context } from '@curveball/core';
import * as querystring from 'querystring';
import { isValidRedirect } from '../utilities.js';
import { MFALoginSession } from '../../mfa/types.js';
import { mfaForm } from '../formats/html.js';
import log from '../../log/service.js';
import { EventType } from '../../log/types.js';
import * as userService from '../../user/service.js';

class MFAController extends Controller {

  async get(ctx: Context) {

    const { user, mfaType }: MFALoginSession = ctx.session.mfa || {};

    if (!user) {
      return this.redirectToLogin(ctx);
    }

    const useTotp = mfaType === 'totp';
    const useWebAuthn = mfaType === 'webauthn';

    ctx.response.type = 'text/html';
    ctx.response.body = mfaForm(
      ctx.query.msg,
      ctx.query.error,
      useTotp,
      useWebAuthn,
      {
        continue: ctx.query.continue,
      },
    );

  }

  async post(ctx: Context<any>) {

    const { user }: MFALoginSession = ctx.session.mfa || {};

    if (!user) {
      return this.redirectToLogin(ctx);
    }

    if (ctx.request.body.totp) {
      if (!await userService.validateTotp(user, ctx.request.body.totp)) {
        log(EventType.totpFailed, ctx.ip(), user.id);
        return this.redirectToMfa(ctx, 'Incorrect TOTP code');
      }
    } else {
      return this.redirectToMfa(ctx, 'TOTP token required');
    }

    if (ctx.request.body.continue && !isValidRedirect(ctx.request.body.continue)) {
      return this.redirectToMfa(ctx, 'Invalid continue URL provided');
    }

    ctx.session = {
      user: user,
    };
    log(EventType.loginSuccess, ctx);

    ctx.status = 303;
    if (ctx.request.body.continue) {
      ctx.response.headers.set('Location', ctx.request.body.continue);
      return;
    }
    ctx.response.headers.set('Location', '/');

  }

  async redirectToMfa(ctx: Context, error: string) {

    ctx.response.status = 303;
    ctx.response.headers.set('Location', '/login/mfa?' + querystring.stringify({ error }));

  }

  async redirectToLogin(ctx: Context) {

    ctx.response.status = 303;
    ctx.response.headers.set('Location', '/login');

  }
}

export default new MFAController();
