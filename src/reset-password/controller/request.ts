import Controller from '@curveball/controller';
import { Context } from '@curveball/core';
import { NotFound, BadRequest } from '@curveball/http-errors';
import log from '../../log/service.js';
import { EventType } from '../../log/types.js';
import { PrincipalService } from '../../principal/service.js';
import { resetPasswordRequestForm } from '../formats/html.js';
import { sendResetPasswordEmail } from '../service.js';


/**
 * This controller is used for requesting change password when the user forgot the password.
 *
 * In this flow a user first submits the email address and if the email exists in the database,
 * server will send an email.
 */
class ResetPasswordRequestController extends Controller {

  async get(ctx: Context) {

    ctx.response.type = 'text/html';
    ctx.response.body = resetPasswordRequestForm(ctx.query.msg, ctx.query.error);

  }

  async post(ctx: Context<any>) {

    // Insecure means there are no privilege restrictions in doing this.
    // Normally findByIdentity is protected but for this specific case it's public.
    const principalService = new PrincipalService('insecure');
    let user;
    try {
      user = await principalService.findByIdentity('mailto:' + ctx.request.body.emailAddress);
    } catch (err) {
      if (err instanceof NotFound) {
        ctx.redirect(303, '/reset-password?error=Account+not+found.+Please+try+again');
        return;
      } else {
        throw err;
      }
    }

    if (!user.active) {
      ctx.redirect(303, '/reset-password?error=User+account+is+inactive,+please+contact+administrator.');
      return;
    }
    if (user.type !== 'user') {
      throw new BadRequest('This endpoint can only be called for principals of type \'user\'.');
    }
    await sendResetPasswordEmail(user);
    await log(EventType.resetPasswordRequest, ctx.ip()!, user.id);

    ctx.redirect(303, '/reset-password?msg=Password+reset+request+submitted.+Please+check+your+email+for+further+instructions.');
  }
}

export default new ResetPasswordRequestController();
