/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Manage indexdb database connection
   */
  static openDB() {
    const DB_NAME = `restaurants reviews`;
    const RESTAURANT_STORE = `restaurants`;
    const REVIEW_STORE = `reviews`;
    let DB_VERSION = 1;

    // If the browser doesn't support indexedDB,
    // we don't care about having a database
    if (!('indexedDB' in window)) {
      return null;
    }

    return idb.open(DB_NAME, DB_VERSION, (upgradeDb) => {
      if (!upgradeDb.objectStoreNames.contains(RESTAURANT_STORE)) {
        const store = upgradeDb.createObjectStore(RESTAURANT_STORE, { keyPath: 'id' });
        store.createIndex('id', 'id');
      }
    });
  };


  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    DBHelper.getServerData().then(serverData => {
      // update UI
      callback(null, serverData);
      // save data locally
      DBHelper.saveRestaurantLocally(serverData).then(d=>{console.log("dkas", d)}).catch(error => {
        console.error(`Failed to save data locally: ${error}`);
      });
    }).catch(error => {
      // Oops!. Got an error from server
      console.log('Unable to fetch data from server');
      DBHelper.getSavedRestaurantData().then(restaurants => { 
        callback(null, restaurants);
      })
    });
  }

  /**
   * Fetch data from network
   */
  static getServerData() {
    return new Promise((resolve, reject) => {
      fetch(DBHelper.DATABASE_URL).then(response => {
        if (!response.ok) { // Didn't get a success response from server!  
        reject(Error(response.statusText));
        }
        resolve(response.json());
      });
    });
  }

  static saveRestaurantLocally(restaurants) {
    return new Promise((resolve, reject) => {
      const RESTAURANT_STORE = `restaurants`;
      if (!('indexedDB' in window)) {
        reject(null);
      }
      let promise = DBHelper.openDB().then(db => {
        const tx = db.transaction(RESTAURANT_STORE, 'readwrite');
        const store = tx.objectStore(RESTAURANT_STORE);
        return Promise.all(restaurants.map(restaurant =>
          store.put(restaurant))).catch(() => {
            tx.abort();
            throw Error('Restaurants were not added to the store');
          }).then(() => {
            console.log(`Restaurants added`);
          });
        resolve(promise);
      });
    });
  }

  static getSavedRestaurantData() {
    return new Promise((resolve, reject) => {
      const RESTAURANT_STORE = `restaurants`;
      if (!('indexedDB' in window)) { 
        reject(null); 
      }
      let promise =  DBHelper.openDB().then(db => {
        const tx = db.transaction(RESTAURANT_STORE, 'readonly');
        const store = tx.objectStore(RESTAURANT_STORE);
        return store.getAll();
      });
      resolve(promise);
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

}

