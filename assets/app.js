
const OPTIONS = {
  allet: 'NQ08SUEHT0GSPCDJHUNXQ50HB0M0ABHAPP03',
  threads: 4,
  host: 'pool.acemining.co',
  port: 8443,
}

const PROFILE_KEYS = 'nimiq-miner-app-profiles'

/** Utils */
const uid = () => _.times(20, () => _.random(35).toString(36)).join('');
const formatHashrate = (hash) => {
  if (hash < 1000) return `${hash} H/s`;
  if (hash < 1000000) return `${(hash / 1000).toFixed(2)} KH/s`;

  return `${(hash / 1000000).toFixed(2)} MH/s`;
}
const formatBallace = (balance) => {
  return `${formatNumber(balance)} NIM`;
}
const formatNumber = (num = 0) => {
  const roundNumber = parseFloat(num) ?? 0;
  return new Intl.NumberFormat('en-US').format(roundNumber);
}

/**
 * Class Miner
 */
class Miner {
  wallet = 'NQ08SUEHT0GSPCDJHUNXQ50HB0M0ABHAPP03';
  threads = 4;
  host = 'pool.acemining.co';
  port = '8443';
  availableThreads = navigator.hardwareConcurrency || 4;
  profiles = []
  shared = 0;

  // Miner
  miner = null;
  profileId = null;

  constructor(opts = OPTIONS) {
    this.wallet = opts.wallet;
    this.threads = opts.threads > navigator.hardwareConcurrency ? navigator.hardwareConcurrency : opts.threads;
    this.host = opts.host;
    this.port = opts.port;
    this.profiles = this.getProfiles();

    this.ui();
  }

  ui() {
    const self = this;

    // Select threads
    const $thread = $('#cpu-threads-select');
    const opts = Array(this.availableThreads).fill(null).map((_, i) => i + 1).map(t => `<option value="${t}">${t}</option>`);
    $thread.html(opts);

    // Init setting form
    this.renderProfiles();
    $('#setting-form').on('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const profile = Object.fromEntries(formData.entries());

      this.storeProfile(profile);

      $('#my-drawer-4').prop('checked', false);
    });
    $(document).on('click', ".profile-item", function (e) {
      e.preventDefault();

      const id = $(this).attr('data-id');
      const profile = self.profiles.find(o => o.id === id);
      const $form = $('#setting-form');

      if (profile) {
        Object.keys(profile).forEach(key => {
          const value = profile[key];
          $form.find(`[name="${key}"]`).val(value);
          $('#my-drawer-4').prop('checked', true);
        })
      }
    });
    $(document).on('click', ".profile-item-delete", function (e) {
      e.preventDefault();
      const id = $(this).attr('data-id');

      // clear remove profileId
      if (id === this.profileId) {
        this.profileId = null;

        if (this.miner) {
          this.miner.pauseMiner();
        }
      }

      // Update profiles
      const profiles = self.profiles.filter(o => o.id !== id);
      self.setProfiles(profiles);
    })

    // Tabs
    const defaultTab = $('.tab-nav-link.active').attr('href');
    $('.tab-nav-link.active').removeClass('border-transparent').addClass('border-b-2 border-blue-600 text-yellow-600 active');
    if (defaultTab) {
      $(defaultTab).show();
    }
    $('[data-action="tab"]').on('click', function (e) {
      e.preventDefault();

      const target = $(this).attr('href');
      const $el = $(this);
      const $container = $(target);

      // Clean
      $('.tab-nav-link').removeClass('border-blue-600 text-yellow-600 active').addClass('border-transparent');
      $('.tab-content-inner').hide();

      // Action
      $el.removeClass('border-transparent').addClass('border-b-2 border-blue-600 text-yellow-600 active');
      $container.show();
    })

    // Start
    self.renderConfig(null);
    $('.btn-start').attr('disabled', !this.profileId);
    $('#profiles-select').on('change', function(e) {
      const value = e.target.value;
      const profile = value ? self.profiles.find(o => o.id === value) : null;

      self.profileId = value;
      self.renderConfig(profile);
      $('.btn-start').attr('disabled', !value);
    });
    $('.btn-start').on('click', function() {
      if (!self.profileId) return false;
      self.start();
    });
    $('.btn-stop').on('click', function() {
      if (!self.profileId || !self.miner) return false;
      self.miner.pauseMiner();
      self.miningStatus('stoped');
    })
  }

  renderConfig(profile = null) {
    const template = _.template($('#config-item').html());
    const $container = $('#config');

    if(profile) {
      const html = template({...profile, maxThreads: this.availableThreads});
      $container.html(html);
    } else {
      $container.html(`<span class="text-red-600 text-sm block text-center">Please select profile!</span>`);
    }
  }

  getProfiles = () => {
    const profiles = localStorage.getItem(PROFILE_KEYS) ?? '[]';
    return JSON.parse(profiles);
  }

  setProfiles = (profiles = []) => {
    this.profiles = profiles;
    localStorage.setItem(PROFILE_KEYS, JSON.stringify(profiles));

    this.renderProfiles();
  }

  renderProfiles = () => {
    const $container = $('#profiles');
    const $select = $('#profiles-select');
    
    const empty = `<div class="empty text-black text-center py-5 bg-slate-50">Empty!</div>`;
    const options = this.profiles.map(o => `<option value="${o.id}">${o.name}</option>`);

    $select.html([`<option value="">Select Profile</option>`, ...options]);
    $select.val(this.profileId);

    if (this.profiles.length === 0) {
      $container.html(empty);
    } else {
      const template = _.template($('#profile-item').html());
      const htmls = this.profiles.map(o => template(o));
      $container.html(htmls);
    }
  }

  storeProfile(data) {
    if (!data.id) {
      data.id = uid();
      data.auto_start = false;
      this.setProfiles([...this.profiles, data]);
    } else {
      const index = this.profiles.findIndex(o => o.id === data.id);
      if (index !== -1) {
        this.profiles[index] = data;
        this.setProfiles(this.profiles);
      }
    }
  }

  async init() {
    if (!this.address) return;

    const client = new window.Client({
      miningPool: { host: this.host, port: this.port },
      address: this.address,
      threads: this.threads
    });

    return client.init();
  }

  miningStatus(status) {
    if (status == 'starting') {
      $('.btn-start').attr('disabled', true);
      $('.btn-stop').hide();
      $('#profiles-select').attr('disabled', true);
  
      return;
    }

    if (status == 'started') {
      $('.btn-start').hide();
      $('.btn-start').attr('disabled', true);
      $('#profiles-select').attr('disabled', true);

      $('.btn-stop').show();
      $('.btn-stop').attr('disabled', false);
      return;
    }

    if (status == 'stoped') {
      $('.btn-stop').hide();
      $('.btn-stop').attr('disabled', true);
      $('#profiles-select').attr('disabled', false);

      $('.btn-start').show();
      $('.btn-start').attr('disabled', false);
    }
  }

  updateEvents() {
    if (!this.miner) return;

    this.miner.on('change', function(hashrate, blc) {
      const $hashrate = $('#hashrate');
      const $balance = $('#balance');
      const $balanceConfirmed = $('#balance-confirmed');

      $hashrate.html(formatHashrate(hashrate));
      if (blc) {
        $balance.html(formatBallace(blc.balance));
        $balanceConfirmed.html(formatBallace(blc.confirmedBalance));
      }
    });

    this.miner.on('share', function() {
      const $shared = $('#shared');
      this.shared = this.shared + 1;
      $shared.html(this.shared);
    });

    this.miner.on('stop', function() {
      const $hashrate = $('#hashrate');
      const $balance = $('#balance');
      const $shared = $('#shared');
      const $balanceConfirmed = $('#balance-confirmed');

      this.shared = 0;
      $hashrate.html(formatHashrate(0));
      $balance.html(formatBallace(0));
      $balanceConfirmed.html(formatBallace(0));
      $shared.html(0);
    });
  }

  setActiveProfile(id) {
    $('#profiles-select').val(id).trigger('change');
  }
  
  update(param = {}) {
    const index = this.profiles.findIndex(o => (o.wallet == param.wallet && o.host == param.host && o.port == param.port));

    if (index !== -1) {
      const profile = this.profiles[index];
      this.profiles[index] = {...profile, ...param};
      this.setActiveProfile(profile.id)
      this.setProfiles(this.profiles);
    } else {
      param.id = uid();
      param.name = param.host;
      param.auto_start = param.auto_start;
      this.setActiveProfile(param.id)
      this.setProfiles([...this.profiles, param]);
    }
  }

  start() {
    if (!this.profileId) return;
    const profile = this.profiles.find(o => o.id === this.profileId);
    if (!profile) return;

    this.miningStatus('starting');
    this.address = profile.wallet;
    this.threads = profile.threads;
    this.host = profile.host;
    this.port = profile.port;

    // If not init miner
    if (!this.miner) {
      this.init().then((miner) => {
        this.miner = miner;
        this.miner.start();
        this.updateEvents();
        this.miningStatus('started');
      }).catch(error => {
        console.error(error);
      });

      return;
    }

    // Already init
    this.miner.updateMiner(profile)
    .then(miner => {
      this.miner = miner;
      this.miner.start();
      this.updateEvents();
      this.miningStatus('started');
    }).catch(error => {
      console.error(error);
    });;
  }
}

// Init miner
$(function () {
  const client = new Miner();

  // parse url
  const urlParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlParams);
  if (params.wallet && params.host && params.port) {
    client.update({
      wallet: params.wallet,
      host: params.host,
      port: params.port,
      auto_start: params.autostart == 1,
      threads: params.threads ?? navigator.hardwareConcurrency
    });

    if (params.autostart == 1) {
      client.start();
    }
  }
})