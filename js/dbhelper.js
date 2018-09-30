
/**
 * Common database helper functions.
 */
class DBHelper {

  static get RESTAURANT_STORE() {
    return `Restaurants`;
  }

  static get REVIEW_STORE() {
    return `Reviews`;
  }

  static get OFFLINE_STORE() {
    return `Outbox`;
  }

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
  }

  /**
   * Manage indexdb database connection
   */
  static openDB() {
    const DB_NAME = `Restaurants Reviews`;
    let DB_VERSION = 1;

    // If the browser doesn't support indexedDB,
    // we don't care about having a database
    if (!('indexedDB' in window)) {
      return null;
    }

    return idb.open(DB_NAME, DB_VERSION, (upgradeDb) => {
      if (!upgradeDb.objectStoreNames.contains(DBHelper.RESTAURANT_STORE)) {
        const restaurant_store = upgradeDb.createObjectStore(DBHelper.RESTAURANT_STORE, { keyPath: 'id' });
        restaurant_store.createIndex('id', 'id');
        const reviews_store = upgradeDb.createObjectStore(DBHelper.REVIEW_STORE, { keyPath: 'id' });
        reviews_store.createIndex('id', 'id');
        const outbox_data = upgradeDb.createObjectStore(DBHelper.OFFLINE_STORE, { keyPath: 'createdAt' });
        outbox_data.createIndex('restaurant_id', 'restaurant_id');
      }
    });
  };


  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    DBHelper.getAllRestaurants().then(restaurants => {
      // update UI
      callback(null, restaurants);
      // save data locally
      DBHelper.saveRestaurantLocally(restaurants).then(data => {
        console.log(`Fetched all restaurants data from server`)
      }).catch(error => {
        console.error(`Failed to save restaurants locally: ${error.stack}`);
      });
    }).catch(error => {
      // Oops!. Got an error from server
      console.log(`Unable to fetch restaurants from server: ${error.stack}`);
      DBHelper.getSavedRestaurantData().then(restaurants => {
        callback(null, restaurants);
      })
    });
  }

  static getAllRestaurants() {
    return new Promise((resolve, reject) => {
      const apiEndpoint = `${DBHelper.DATABASE_URL}/restaurants`;
      DBHelper.getServerData(apiEndpoint).then(response => {
        return resolve(response);
      }).catch(error => {
        return reject(error);
      })
    });
  }

  static getRestaurantById(restaurant_id) {
    return new Promise((resolve, reject) => {
      const apiEndpoint = `${DBHelper.DATABASE_URL}/restaurants/${restaurant_id}`;
      DBHelper.getServerData(apiEndpoint).then(response => {
        return resolve(response);
      }).catch(error => {
        return reject(error);
      })
    });
  }

  static getRestaurantReviewById(restaurant_id) {
    return new Promise((resolve, reject) => {
      const apiEndpoint = `${DBHelper.DATABASE_URL}/reviews/?restaurant_id=${restaurant_id}`;
      DBHelper.getServerData(apiEndpoint).then(response => {
        return resolve(response);
      }).catch(error => {
        return reject(error);
      })
    });
  }

  static addReview(review) {
    return new Promise((resolve, reject) => {
      const apiEndpoint = `${DBHelper.DATABASE_URL}/reviews/`;
      DBHelper.mutateData(apiEndpoint, 'POST', review).then(response => {
        console.info(`Successfully submitted review`);
        // save data locally
        DBHelper.saveRestaurantReviews(response, DBHelper.REVIEW_STORE).then(review => {
          console.info(`Review saved for offline use`);
          return resolve(response);
        }).catch(error => {
          console.error(`Failed to save review: ${error.stack}`);
          return resolve(response);
        });
      }).catch(error => {
        console.info(`No internet, failed to upload review: ${error.stack}`);
        DBHelper.saveRestaurantReviews(review, DBHelper.OFFLINE_STORE).then(resp => {
          console.log(`Review will be uploaded automatically when connected to internet`);
          Snackbar.show({
            text: `Not connected, Review will be uploaded once re-connected!`,
            actionText: 'OK',
            textColor: '#fff',
            actionTextColor: '#f44336',
            pos: 'bottom-center'
          });
          return resolve(review);
        }).catch(error => {
          console.error(`Failed to save review: ${error.stack}`);
          return reject(error);
        });
      });
    });
  }

  static mutateData(url, HttpMethod, object) {
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: HttpMethod,
        body: JSON.stringify(object),
        headers: {
          'Content-Type': 'application/json',
        }
      }).then(response => response.json()).then(response => {
        return resolve(response);
      }).catch(error => {
        console.log('1', error.stack);
        return reject(error);
      })
    });
  }

  static fetchRestaurantReviews(restaurant, callback) {
    DBHelper.getRestaurantReviewById(restaurant.id).then(reviews => {
      // update UI
      callback(null, reviews);
      // save data locally
      DBHelper.saveRestaurantReviews(reviews, DBHelper.REVIEW_STORE).then(data => {
        console.log(`Review from Server`);
      }).catch(error => {
        console.error(`Failed to save review locally: ${error.stack}`);
      });
    }).catch(error => {
      // Oops!. Got an error from server
      console.log(`Unable to fetch review from server: ${error.stack}`);
      Snackbar.show({
        text: `You lost connection.`,
        actionText: 'OK',
        actionTextColor: '#f44336',
        textColor: '#fff',
        pos: 'bottom-center'
      });
      DBHelper.getSavedReview(restaurant.id).then(reviews => {
        callback(null, reviews);
      })
    });
  }

  static getSavedReview(restaurant_id) {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        return reject(null);
      }

      if (!restaurant_id) {
        let promise = DBHelper.openDB().then(db => {
          const tx = db.transaction(DBHelper.REVIEW_STORE, 'readonly');
          const reviews_store = tx.objectStore(DBHelper.REVIEW_STORE);
          return reviews_store.getAll();
        });
        return resolve(promise);
      } else {
        let promise = DBHelper.openDB().then(db => {
          const tx = db.transaction(DBHelper.REVIEW_STORE, 'readonly');
          const reviews_store = tx.objectStore(DBHelper.REVIEW_STORE);
          return reviews_store.get(restaurant_id);
        });
        return resolve(promise);
      }
    });
  }

  /**
   * Fetch data from network
   */
  static getServerData(url) {
    return new Promise((resolve, reject) => {
      fetch(url, { mode: 'cors' }).then(response => {
        if (!response.ok) { // Didn't get a success response from server!  
          return reject(Error(response.statusText));
        }
        return resolve(response.json());
      }).catch(error => {
        console.log('Request failed', error.stack);
        return reject(error);
      });
    });
  }

  static saveRestaurantLocally(restaurants) {
    if (!Array.isArray(restaurants)) {
      let restaurant = [];
      restaurant.push(restaurants);
      restaurants = restaurant;
    }
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        return reject(null);
      }
      let promise = DBHelper.openDB().then(db => {
        const tx = db.transaction(DBHelper.RESTAURANT_STORE, 'readwrite');
        const restaurant_store = tx.objectStore(DBHelper.RESTAURANT_STORE);
        return Promise.all(restaurants.map(restaurant =>
          restaurant_store.put(restaurant))).catch(() => {
            tx.abort();
            throw Error('Restaurants were not added to the store');
          }).then(() => {
            console.log(`Restaurants added to DB`);
          });
      });
      return resolve(promise);
    });
  }

  static saveRestaurantReviews(reviews, storeName) {
    if (!Array.isArray(reviews)) {
      let review = [];
      review.push(reviews);
      reviews = review;
    }
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        return reject(null);
      }
      let promise = DBHelper.openDB().then(db => {
        const tx = db.transaction(storeName, 'readwrite');
        const reviews_store = tx.objectStore(storeName);
        return Promise.all(reviews.map(review =>
          reviews_store.put(review))).catch(() => {
            tx.abort();
            throw Error(`Reviews were not added to the ${storeName}`);
          }).then(() => {
            console.log(`Reviews added to DB`);
          });
      });
      return resolve(promise);
    });
  }

  static getSavedRestaurantData(restaurant_id) {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        return reject(null);
      }

      if (!restaurant_id) {
        let promise = DBHelper.openDB().then(db => {
          const tx = db.transaction(DBHelper.RESTAURANT_STORE, 'readonly');
          const restaurant_store = tx.objectStore(DBHelper.RESTAURANT_STORE);
          return restaurant_store.getAll();
        });
        return resolve(promise);
      } else {
        let promise = DBHelper.openDB().then(db => {
          let tx = db.transaction(DBHelper.RESTAURANT_STORE, 'readonly');
          let restaurant_store = tx.objectStore(DBHelper.RESTAURANT_STORE);
          return restaurant_store.get(restaurant_id);
        });
        return resolve(promise);
      }
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {

      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return restaurant.id;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      })
    marker.addTo(newMap);
    return marker;
  }
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

  static syncOutBoxData() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        return reject(null);
      }

      let promise = DBHelper.openDB().then(db => {
        const tx = db.transaction(DBHelper.OFFLINE_STORE, 'readonly');
        const reviews_store = tx.objectStore(DBHelper.OFFLINE_STORE);
        return reviews_store.getAll();
      });
      return resolve(promise);
    });
  }

  static clearOutBoxData(createdAt) {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        return reject(null);
      }

      let promise = DBHelper.openDB().then(db => {
        const tx = db.transaction(DBHelper.OFFLINE_STORE, 'readwrite');
        const reviews_store = tx.objectStore(DBHelper.OFFLINE_STORE);
        return reviews_store.delete(createdAt);
      });
      return resolve(promise);
    });
  }
}