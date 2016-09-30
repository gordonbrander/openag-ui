import {html} from 'reflex';
import {port} from './common/prelude';

export const Activate = {
  type: 'Activate'
};

export const view = (model, address) => {
  const sendPoint = onPoint(address);
  return html.div({
    className: 'recipe',
    onTouchStart: sendPoint,
    onMouseDown: sendPoint
  }, [
    String(model._id)
  ]);
}

const onPoint = port(event => {
  event.preventDefault();
  return Activate;
});