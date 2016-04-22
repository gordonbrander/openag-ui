import {html, forward, Effects} from 'reflex';
import {merge, tagged, tag} from '../common/prelude';
import * as Unknown from '../common/unknown';

const RequestNewRecipe = {
  type: 'RequestNewRecipe'
};

export const view = (model, address) =>
  html.header({
    className: 'app-header'
  }, [
    html.nav({
      className: 'gnav-main'
    }, [
      html.a({
        className: 'gnav-new-recipe',
        onClick: () => address(RequestNewRecipe)
      })
    ])
  ]);
