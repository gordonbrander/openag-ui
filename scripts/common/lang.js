/*
@FIXME this file is a placeholder. We need to actually load locale files and
use them to output final localized string.
*/
import {render} from '../common/stache';

export const localize = text => text;

export const localizeTemplate = (text, context) => render(text, context);