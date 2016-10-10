// see vertx-js/util/console.js

/**
 * A simple console object that can be used to print log messages
 * errors, and warnings.
 * @example
 *
 * console.log('Hello standard out');
 * console.warn('Warning standard error');
 * console.error('Alert! Alert!');
 *
 */
interface Console {
  /**
   * Log the msg to STDOUT.
   * @param msg The message to log to standard out.
   */
  log(msg: any);

  /**
   * Log the msg to STDERR
   * @param msg The message to log with a warning to standard error.
   */
  warn(msg: any);

  /**
   * Log the msg to STDERR
   * @param msg The message to log with a warning alert to standard error.
   */
  error(msg: any);
}