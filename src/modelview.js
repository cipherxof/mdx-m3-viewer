/**
 * @class
 * @classdesc This class holds all of the model instances.
 *            It is used to possibly give multiple "views" of the same model.
 *            That is, use the same base model, but have some variations on a per-view basis, hence giving multiple versions of the model.
 *            Mostly used for texture overriding, to allow having multiple instances with different textures.
 * @extends ActionQueue
 * @param {Model} model The model that this view belongs to.
 */
function ModelView(model) {
    /** @member {Model} */
    this.model = model;
    /** @member {Scene} */
    this.scene = null;
    /** @member {ModelInstance[]} */
    this.instances = [];
    /** @member {Bucket[]} */
    this.buckets = [];
    /** @member {map.<ModelInstance, Bucket>} */
    this.instanceToBucket = new Map(); // instance->bucket map
}

ModelView.prototype = {
    /** @member {string} */
    get objectType() {
        return "modelview";
    },

    clear() {
        let instances = this.instances;

        for (let i = 0, l = instances.length; i < l; i++) {
            this.hideInstance(instances[i]);
        }

        instances.length = 0;
    },

    /**
     * @method
     * @desc Add an instance to this model view.
     * @param {Instance} instance The instance to add.
     */
    addInstance(instance) {
        if (instance && instance.objectType === "instance") {
            if (instance.loaded) {
                // If the instance is already in another view, remove it first.
                if (instance.modelView) {
                    instance.modelView.removeInstance(instance);
                }

                this.instances.push(instance);

                instance.modelView = this;
                instance.rendered = true;
            } else {
                instance.whenLoaded(() => this.addInstance(instance));
            }
        }
    },

    /**
     * @method
     * @desc Remove an instance from this model view.
     * @param {Instance} instance The instance to remove.
     */
    removeInstance(instance) {
        if (instance && instance.objectType === "instance") {
            instance.rendered = false;
            instance.modelView = null;

            this.instances.splice(this.instances.indexOf(instance), 1);
        }
    },

    // Find a bucket that isn't full. If no bucket is found, add a new bucket and return it.
    getAvailableBucket() {
        let buckets = this.buckets;

        for (let bucket of buckets) {
            if (!bucket.isFull()) {
                return bucket;
            }
        }

        let bucket = new this.model.Handler.Bucket(this);

        buckets.push(bucket);

        return bucket;
    },

    // Show the given instance
    // This is done by adding it to a bucket, and calling its setSharedData function
    setVisibility(instance, visibility) {
        if (visibility) {
            let bucket = this.getAvailableBucket();

            this.instanceToBucket.set(instance, bucket);

            instance.bucket = bucket;
            instance.setSharedData(bucket.addInstance(instance));
        } else {
            let bucket = this.instanceToBucket.get(instance);

            this.instanceToBucket.delete(instance);

            bucket.removeInstance(instance);

            // Invalidate whatever shared data this instance used, because it doesn't belong to it anymore.
            instance.bucket = null;
            instance.invalidateSharedData();
        }
    },

    update() {
        let buckets = this.buckets;

        for (let i = 0, l = buckets.length; i < l; i++) {
            buckets[i].update();
        }
    },

    renderOpaque() {
        let buckets = this.buckets;

        for (let i = 0, l = buckets.length; i < l; i++) {
            buckets[i].renderOpaque();
        }
    },

    renderTranslucent() {
        let buckets = this.buckets;

        for (let i = 0, l = buckets.length; i < l; i++) {
            buckets[i].renderTranslucent();
        }
    },

    renderEmitters() {
        let buckets = this.buckets;

        for (let i = 0, l = buckets.length; i < l; i++) {
            buckets[i].renderEmitters();
        }
    }
};
