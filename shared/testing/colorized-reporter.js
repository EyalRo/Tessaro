const { DefaultReporter } = require('@jest/reporters');

const ANSI_CODES = {
  reset: '\u001b[0m',
  green: '\u001b[32m',
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  neutral: '\u001b[37m'
};

const STRIP_COLOR_PATTERN = /\u001b\[[0-9;]*m/g;
const POSITIVE_PATTERN = /\bPASS(?:ED)?\b/g;
const NEGATIVE_PATTERN = /\b(?:FAIL(?:ED)?|ERROR)\b/g;
const WARNING_PATTERN = /\bWARN(?:ING)?\b/g;

const wrapWithColor = (segment, colorCode, neutralCode) => `${colorCode}${segment}${neutralCode}`;

const applyNeutral = (message, neutralCode) => {
  if (!message) {
    return message;
  }
  return `${neutralCode}${message}${ANSI_CODES.reset}`;
};

class ColorizedReporter extends DefaultReporter {
  constructor(globalConfig, options = {}) {
    super(globalConfig);
    this.positiveColor = options.positiveColor || ANSI_CODES.green;
    this.negativeColor = options.negativeColor || ANSI_CODES.red;
    this.warningColor = options.warningColor || ANSI_CODES.yellow;
    this.neutralColor = options.neutralColor || ANSI_CODES.neutral;
  }

  log(message) {
    super.log(this.colorizeMessage(String(message)));
  }

  colorizeMessage(message) {
    const strippedMessage = message.replace(STRIP_COLOR_PATTERN, '');

    const withPositive = strippedMessage.replace(
      POSITIVE_PATTERN,
      (match) => wrapWithColor(match, this.positiveColor, this.neutralColor)
    );

    const withNegative = withPositive.replace(
      NEGATIVE_PATTERN,
      (match) => wrapWithColor(match, this.negativeColor, this.neutralColor)
    );

    const withWarnings = withNegative.replace(
      WARNING_PATTERN,
      (match) => wrapWithColor(match, this.warningColor, this.neutralColor)
    );

    return applyNeutral(withWarnings, this.neutralColor);
  }
}

module.exports = ColorizedReporter;
