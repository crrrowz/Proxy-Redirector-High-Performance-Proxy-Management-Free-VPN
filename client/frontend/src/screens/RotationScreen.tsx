import { useState, useEffect } from 'react';
import { Power, RefreshCw } from 'lucide-react';
import { RotationFilters } from '../components/RotationFilters';
import { RotationStatusView } from '../components/RotationStatus';
import { GetRotationStatus, EnableRotation, DisableRotation } from '../../wailsjs/go/main/App';

export function RotationScreen() {
  const [enabled, setEnabled] = useState(false);
  const [types, setTypes] = useState<string[]>(['all']);
  const [country, setCountry] = useState('');
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [sslOnly, setSslOnly] = useState(false);
  const [poolSize, setPoolSize] = useState(0);
  const [intervalSec, setIntervalSec] = useState(60);

  const [status, setStatus] = useState<any>(null);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  
  // In a real app we might fetch available countries from GetRegions or GetProxies
  useEffect(() => {
    // Just mock some countries for now, or fetch them if needed
    setAvailableCountries(['US', 'UK', 'DE', 'FR', 'CA', 'JP', 'IN']);
  }, []);

  // Load filters from server ONLY once on mount
  const loadInitial = () => {
    GetRotationStatus()
      .then((st: any) => {
        if (!st) return;
        setStatus(st);
        setEnabled(st.enabled || false);
        if (st.enabled) {
          setTypes(st.proxy_types && st.proxy_types.length > 0 ? st.proxy_types : ['all']);
          setCountry(st.country_filter || '');
          setMaxSpeed(st.max_speed_ms || 0);
          setSslOnly(st.ssl_only || false);
          setPoolSize(st.pool_size || 0);
          setIntervalSec(st.interval_sec || 60);
        }
      })
      .catch(console.error);
  };

  // Polling: update status display ONLY, never overwrite local filter state
  const pollStatus = () => {
    GetRotationStatus()
      .then((st: any) => {
        if (!st) return;
        setStatus(st);
        setEnabled(st.enabled || false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadInitial();
    const timer = setInterval(pollStatus, 3000);
    return () => clearInterval(timer);
  }, []);

  const toggleRotation = async () => {
    try {
      if (enabled) {
        await DisableRotation();
        setEnabled(false);
      } else {
        await EnableRotation(intervalSec, types, country, maxSpeed, poolSize, sslOnly);
        setEnabled(true);
      }
      loadInitial();
    } catch (e) {
      console.error(e);
    }
  };

  const saveConfig = async () => {
    if (enabled) {
      // Re-enable to update rules
      try {
        await EnableRotation(intervalSec, types, country, maxSpeed, poolSize, sslOnly);
        loadInitial();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="screen-container">
      <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 className="heading-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={24} className="text-blue" /> Surge Rotation
        </h2>
        
        <button 
          className={`btn ${enabled ? 'btn-danger' : 'btn-primary'}`} 
          onClick={toggleRotation}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Power size={16} />
          {enabled ? 'Disable Surge' : 'Enable Surge'}
        </button>
      </div>

      <RotationStatusView 
        enabled={enabled}
        poolSize={status?.pool_size || 0}
        filteredCount={status?.filtered_count || 0}
        currentIndex={status?.current_index || 0}
        activeIp={status?.active_proxy_ip || ''}
        activePort={status?.active_proxy_port || 0}
        activeType={status?.active_proxy_type || ''}
      />

      <div style={{ marginTop: '24px' }}>
        <RotationFilters 
          disabled={!enabled}
          types={types} setTypes={setTypes}
          country={country} setCountry={setCountry}
          maxSpeed={maxSpeed} setMaxSpeed={setMaxSpeed}
          sslOnly={sslOnly} setSslOnly={setSslOnly}
          poolSize={poolSize} setPoolSize={setPoolSize}
          interval={intervalSec} setInterval={setIntervalSec}
          availableCountries={availableCountries}
          maxPossibleSpeed={2000}
        />
        
        {enabled && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className="btn btn-secondary" onClick={saveConfig}>Apply Rules</button>
          </div>
        )}
      </div>
    </div>
  );
}
