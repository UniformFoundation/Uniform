import Helpers from './helpers';

export type TimeInterval = number | 'even' | 'uneven' | number[];
type EveryTimeConfig = {
    between?: boolean;
};

/**
 * Every Time Class
 */
class EveryTime {
    public interval: TimeInterval = 1;
    public config: EveryTimeConfig = {};

    /**
     *
     * @param {number[]|string|number} every
     * @param {{}} config
     */
    constructor(every: TimeInterval, config: EveryTimeConfig = {}) {
        if (every === 'even') every = 2;
        this.interval = every;

        this.config = Object.assign(this.config, config);
        return this;
    }

    /**
     * Every nth Minute
     */
    minutes(cron = Helpers.minute()): string {
        if (this.config['between'] && Array.isArray(this.interval)) {
            this.config['between'] = false;
            return Helpers.spliceIntoPosition(0, this.interval.join('-'), cron);
        }

        if (typeof this.interval === 'number' && this.interval > 1) {
            return Helpers.spliceIntoPosition(0, '*/' + this.interval, cron);
        } else if (this.interval === 'uneven') {
            return Helpers.spliceIntoPosition(0, '1-59/2', cron);
        }

        return cron;
    }

    /**
     * Every nth Hour
     */
    hours(cron = Helpers.hour()): string {
        if (this.config['between'] && Array.isArray(this.interval)) {
            this.config['between'] = false;
            return Helpers.spliceIntoPosition(1, this.interval.join('-'), cron);
        }

        if (typeof this.interval === 'number' && this.interval > 1) {
            return Helpers.spliceIntoPosition(1, '*/' + this.interval, cron);
        } else if (this.interval === 'uneven') {
            return Helpers.spliceIntoPosition(1, '1-23/2', cron);
        }

        return cron;
    }

    days(cron = Helpers.day(0, 0)): string {
        if (this.config['between'] && Array.isArray(this.interval)) {
            this.config['between'] = false;
            return Helpers.spliceIntoPosition(2, this.interval.join('-'), cron);
        }

        if (typeof this.interval === 'number' && this.interval > 1) {
            return Helpers.spliceIntoPosition(2, '*/' + this.interval, cron);
        } else if (this.interval === 'uneven') {
            return Helpers.spliceIntoPosition(2, '1-31/2', cron);
        }

        return cron;
    }
}

export default EveryTime;
