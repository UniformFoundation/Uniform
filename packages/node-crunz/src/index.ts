import EveryTime, { TimeInterval } from './EveryTime';
import Helpers, { Day } from './helpers';
import { CronTuple } from './types';

function assertValidCron(cron: string[]): cron is CronTuple {
    if (cron.length !== 5) throw new Error('Invalid cron, expected 5 elements got ' + JSON.stringify(cron));

    return true;
}

class Task {
    private name: string;
    private executor: () => Promise<void>;

    constructor(name: string, executor: () => Promise<void>) {
        this.name = name;
        this.executor = executor;
    }

    getTimeBuilder() {
        return new Builder(this);
    }

    getName() {
        return this.name;
    }

    getExecutor() {
        return this.executor;
    }
}

class Builder {
    private cron = ['*', '*', '*', '*', '*'] as CronTuple;
    private runsAt: Date | null = null;
    private task: Task;

    private setCron(cron: CronTuple) {
        this.cron = cron;
    }

    constructor(task: Task) {
        this.task = task;
    }

    build() {
        if (this.runsAt)
            return {
                name: this.task.getName(),
                runsAt: this.runsAt,
                execute: this.task.getExecutor(),
            };

        return {
            name: this.task.getName(),
            cron: this.cron.join(' '),
            execute: this.task.getExecutor(),
        };
    }

    at(hhMmStr: string) {
        const [hh, mm] = hhMmStr.split(':');

        this.cron[0] = hh;
        this.cron[1] = mm;

        this.setCron(this.cron);
        return this;
    }

    atHour(hh: string) {
        this.cron[0] = hh;
        this.setCron(this.cron);
        return this;
    }

    atMinute(hh: string) {
        this.cron[1] = hh;
        this.setCron(this.cron);
        return this;
    }

    onceAt(date: Date | number | string) {
        this.runsAt = new Date(date);

        return {
            // prevent from doing anything further.
            build: () => ({
                name: this.task.getName(),
                runsAt: this.runsAt,
                execute: this.task.getExecutor(),
            }),
        };
    }

    monthly(): Builder {
        this.cron[2] = '1';
        this.cron[3] = '*';

        this.setCron(this.cron);

        return this;
    }

    daily(): Builder {
        this.cron[2] = '*';
        this.cron[3] = '*';

        this.setCron(this.cron);

        return this;
    }

    onSpecificDays(days: string[]): Builder {
        if (!Array.isArray(days) || days.length === 0) {
            throw new Error('onSpecificDays expects days to be an array of days string.');
        }

        const intDays = Helpers.daysToIntegers(days);

        this.cron[4] = intDays.join(',');
        this.setCron(this.cron);

        return this;
    }

    /**
     * Every Minute
     */
    everyMinute(): Builder {
        this.cron[0] = '*';
        this.cron[1] = '*';
        this.setCron(this.cron);

        return this;
    }

    everyHour() {
        this.cron[1] = '*';
        this.setCron(this.cron);
        return this;
    }

    every(value: TimeInterval, type: 'days' | 'hours' | 'minutes') {
        const every = new EveryTime(value, { between: false });

        const newCron = every[type](this.cron.join(' ')).split(' ');
        if (assertValidCron(newCron)) {
            this.setCron(newCron);
        }

        return this;
    }

    betweenEvery(value: TimeInterval, type: 'days' | 'hours' | 'minutes') {
        const every = new EveryTime(value, { between: true });

        const newCron = every[type](this.cron.join(' ')).split(' ');
        if (assertValidCron(newCron)) {
            this.setCron(newCron);
        }

        return this;
    }

    everyHourAt(minuteOfTheHour: number): Builder {
        this.cron[0] = `${minuteOfTheHour}`;
        this.cron[1] = '*';
        this.setCron(this.cron);
        return this;
    }

    everyWeekDay(startDay: Day | number = 'monday', endDay: Day | number = 'friday') {
        startDay = Helpers.dayToInt(startDay);
        endDay = Helpers.dayToInt(endDay);

        Helpers.validateStartToEndDay(startDay, endDay);
        this.cron[4] = `${startDay}-${endDay}`;
        this.setCron(this.cron);

        return this;
    }

    /**
     * Every Year
     */
    static everyYear(): string {
        return Builder.everyYearIn(1);
    }

    /**
     * Every Year In
     * @param monthOfTheYear  - Month of the year
     * @param dayOfTheMonth - Day of the month
     * @param hourOfTheDay - Hour of the day
     * @param minuteOfTheHour - Minute of the hour.
     */
    static everyYearIn(
        monthOfTheYear: number,
        dayOfTheMonth: number = 1,
        hourOfTheDay: number = 0,
        minuteOfTheHour: number = 0
    ): string {
        return `${minuteOfTheHour} ${hourOfTheDay} ${dayOfTheMonth} ${monthOfTheYear} *`;
    }
}

export default Task;
