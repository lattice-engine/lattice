import { World } from "thyseus";

import { LatticeSchedules } from "./schedules";

const FIXED_HZ = 60;

/**
 * Stores the ECS world and manages the game loop.
 */
export class Engine {
  readonly world: World;

  #lastFixedTime = 0;
  #leftoverFixedTime = 0;

  #animationFrame: number | null = null;
  #startPromise: Promise<void> | null = null;

  #scheduleQueue: symbol[] = [];

  /**
   * Creates a new WorldBuilder.
   */
  static createWorld() {
    const world = World.new();
    return world;
  }

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Starts the engine.
   */
  async start() {
    const stopPromise = this.stop();
    if (stopPromise) await stopPromise;

    this.#startPromise = this.world.runSchedule(LatticeSchedules.Startup);
    await this.#startPromise;

    this.#lastFixedTime = performance.now();

    this.#animationFrame = requestAnimationFrame(this.#loop.bind(this));
  }

  async #loop() {
    const time = performance.now();

    await this.#runSchedule(LatticeSchedules.PreUpdate);
    await this.#runSchedule(LatticeSchedules.Update);
    await this.#runSchedule(LatticeSchedules.PostUpdate);

    const fixedStep = 1000 / FIXED_HZ;
    this.#leftoverFixedTime += time - this.#lastFixedTime;

    if (this.#leftoverFixedTime >= fixedStep) {
      await this.#runSchedule(LatticeSchedules.PreFixedUpdate);
      await this.#runSchedule(LatticeSchedules.FixedUpdate);
      await this.#runSchedule(LatticeSchedules.PostFixedUpdate);

      this.#leftoverFixedTime -= fixedStep;
      this.#lastFixedTime = time;
    }

    while (this.#scheduleQueue.length > 0) {
      const schedule = this.#scheduleQueue.shift();
      if (schedule) await this.#runSchedule(schedule);
    }

    await this.#runSchedule(LatticeSchedules.Render);

    await this.#runSchedule(LatticeSchedules.ApplyCommands);

    this.#animationFrame = requestAnimationFrame(this.#loop.bind(this));
  }

  /**
   * Stops the engine.
   */
  stop() {
    if (this.#startPromise !== null) {
      return this.#startPromise.then(() => {
        this.#startPromise = null;
        this.stop();
      });
    }

    if (this.#animationFrame !== null) {
      cancelAnimationFrame(this.#animationFrame);
      this.#animationFrame = null;
    }
  }

  /**
   * Destroys the engine.
   */
  async destroy() {
    await this.stop();
    await this.#runSchedule(LatticeSchedules.Destroy);
    await this.#runSchedule(LatticeSchedules.Update);
    await this.#runSchedule(LatticeSchedules.FixedUpdate);
  }

  /**
   * Runs a schedule, if it exists.
   */
  async #runSchedule(schedule: symbol) {
    if (this.world.schedules[schedule]) await this.world.runSchedule(schedule);
  }

  queueSchedule(schedule: symbol) {
    this.#scheduleQueue.push(schedule);
  }
}
