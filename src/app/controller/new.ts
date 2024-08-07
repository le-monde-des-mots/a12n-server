import Controller from '@curveball/controller';
import { Context } from '@curveball/core';
import { PrincipalService } from '../../principal/service.js';
import { createAppForm } from '../formats/html.js';
import { uuidUrn } from '../../crypto.js';

type AppNewForm = {
  nickname: string;
  url: string;
  clientId?: string;
  allowedGrantTypes?: string;
  redirectUris?: string;
  requirePkce?: string;
}

class CreateAppController extends Controller {

  async get(ctx: Context) {

    ctx.privileges.require('admin');
    ctx.response.type = 'text/html';

    ctx.response.body = createAppForm({
      csrfToken: await ctx.getCsrf(),
      msg: ctx.query.msg,
      error: ctx.query.error,
      nickname: ctx.query.nickname,
      url: ctx.query.url,
      clientId: ctx.query.clientId,
      allowedGrantTypes: ctx.query.allowedGrantTypes,
      redirectUris: ctx.query.redirectUris,
      requirePkce: ctx.query.requirePkce
    });
  }

  async post(ctx: Context) {

    ctx.request.validate<AppNewForm>('https://curveballjs.org/schemas/a12nserver/app-new-form.json');

    const principalService = new PrincipalService(ctx.privileges);

    const nickname = ctx.request.body.nickname;
    const identity = ctx.request.body.url || uuidUrn();

    const newApp = await principalService.save({
      type: 'app',
      nickname,
      active: true,
      identity,
      createdAt: new Date(),
      modifiedAt: new Date(),
    });

    ctx.response.status = 303;

    let newLocation = newApp.href;

    if (ctx.request.body.clientId || ctx.request.body.allowedGrantTypes || ctx.request.body.redirectUris || ctx.request.body.requirePkce ) {
      const params = {
        ...(ctx.request.body.clientId && {
          clientId: ctx.request.body.clientId
        }),
        ...(ctx.request.body.allowedGrantTypes && {
          allowedGrantTypes: ctx.request.body.allowedGrantTypes
        }),
        ...(ctx.request.body.redirectUris && {
          redirectUris: ctx.request.body.redirectUris
        }),
        ...(ctx.request.body.requirePkce && {
          requirePkce: ctx.request.body.requirePkce
        }),
      };

      newLocation = `${newLocation}/client/new?${new URLSearchParams(params)}`;
    }

    ctx.response.status = 303;
    ctx.response.headers.set('Location', newLocation);
  }

}
export default new CreateAppController();
