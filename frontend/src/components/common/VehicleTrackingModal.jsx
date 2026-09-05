import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  TextField,
  Box,
  Divider,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import { fetchVehicleTrackingData } from '../../utils/manifest';
import RouteMap from './RouteMap';

function VehicleTrackingModal({ open, vehicleNo, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !vehicleNo) return;

    setLoading(true);
    setError(null);
    setData(null);

    fetchVehicleTrackingData(vehicleNo)
      .then(trackingData => {
        if (trackingData) {
          setData(trackingData);
        } else {
          console.log('getting error')
          setError('No tracking data available for this vehicle');
        }
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch tracking data');
      })
      .finally(() => setLoading(false));
  }, [open, vehicleNo]);

  const formatTime = (dt) => {
    if (!dt) return '-';
    return new Date(dt).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const formatDistance = (km) => {
    return km ? `${parseFloat(km).toFixed(2)} km` : '0 km';
  };

  const getDistanceProgress = () => {
    if (!data?.distance || !data?.distance_covered) return 0;
    return Math.min((data.distance_covered / data.distance) * 100, 100);
  };

  const getTripStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'arrived': return 'success';
      case 'delay': return 'error';
      case 'early': return 'info';
      default: return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{
      sx: { borderRadius: 2 }
    }}>
      {/* Header */}
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)',
        color: 'white',
        fontWeight: 700,
        fontSize: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 2.5,
      }}>
        🚛 IN TRANSIT VEHICLE TRACKING
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading && (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
            flexDirection: 'column',
            gap: 2,
          }}>
            <CircularProgress size={50} sx={{ color: '#7e22ce' }} />
            <span style={{ color: '#7e22ce', fontWeight: 600, fontSize: 14 }}>Fetching vehicle tracking data...</span>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, fontWeight: 600 }}>
            ⚠️ {error}
          </Alert>
        )}

        {data && (
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {/* Vehicle Info Card */}
            <Card sx={{
              border: '2px solid #e9d5ff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <h4 style={{ margin: 0, color: '#7e22ce', fontSize: 14, fontWeight: 700 }}>
                    VEHICLE INFORMATION
                  </h4>
                  <Chip
                    label={data.trip_status}
                    color={getTripStatusColor(data.trip_status)}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
                <Divider sx={{ mb: 1.5 }} />
                <Grid container spacing={1.5}>
                  <FormField label="Vehicle No" value={data.desp_veh_no} />
                  <FormField label="Vehicle Type" value={data.vehicle_type} />
                  <FormField label="Dispatch No" value={data.desp_doc_no} />
                  <FormField label="Dispatch Date" value={data.desp_doc_date ? new Date(data.desp_doc_date).toLocaleDateString() : '-'} />
                </Grid>
              </CardContent>
            </Card>

            {/* Route Information Card */}
            <Card sx={{
              border: '2px solid #e9d5ff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <h4 style={{ margin: 0, marginBottom: 8, color: '#7e22ce', fontSize: 14, fontWeight: 700 }}>
                  ROUTE INFORMATION
                </h4>
                <Divider sx={{ mb: 1.5 }} />
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                  <FormField label="From Location" value={data.from_loc} />
                  <FormField label="From Town" value={data.from_town} />
                  <FormField label="To Location" value={data.to_loc} />
                  <FormField label="To Town" value={data.to_town} />
                </Grid>

                {/* Progress Bar */}
                <Box sx={{ mt: 2, p: 1.5, background: '#f3e8ff', borderRadius: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#7e22ce' }}>JOURNEY PROGRESS</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>
                      {getDistanceProgress().toFixed(0)}% Complete
                    </span>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getDistanceProgress()}
                    sx={{
                      height: 8,
                      borderRadius: 10,
                      background: '#e9d5ff',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #7e22ce 0%, #06b6d4 100%)',
                        borderRadius: 10,
                      }
                    }}
                  />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1.5 }}>
                    <Box>
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 3 }}>DISTANCE COVERED</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#06b6d4' }}>
                        {formatDistance(data.distance_covered)}
                      </div>
                    </Box>
                    <Box>
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 3 }}>DISTANCE LEFT</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b' }}>
                        {formatDistance(data.distance - (data.distance_covered || 0))}
                      </div>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Travel Metrics Card */}
            <Card sx={{
              border: '2px solid #e9d5ff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <h4 style={{ margin: 0, marginBottom: 8, color: '#7e22ce', fontSize: 14, fontWeight: 700 }}>
                  TRAVEL METRICS
                </h4>
                <Divider sx={{ mb: 1.5 }} />
                <Grid container spacing={1.5}>
                  <FormField label="Total Distance (KMS)" value={formatDistance(data.distance)} />
                  <FormField label="Trip Duration" value={data.transit_time_hrs ? `${data.transit_time_hrs} hrs` : '-'} />
                  <FormField label="Expected Arrival" value={formatTime(data.expected_arrival_time)} />
                  <FormField label="Revised ETA" value={formatTime(data.revised_eta)} />
                </Grid>
              </CardContent>
            </Card>

            {/* GPS & Location Card */}
            <Card sx={{
              border: '2px solid #e9d5ff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <h4 style={{ margin: 0, marginBottom: 8, color: '#7e22ce', fontSize: 14, fontWeight: 700 }}>
                  CURRENT LOCATION & GPS
                </h4>
                <Divider sx={{ mb: 1.5 }} />
                <Grid container spacing={1.5}>
                  <FormField label="Current Location" value={data.location} fullWidth span={2} />
                  <FormField label="Latitude" value={data.latitude ? parseFloat(data.latitude).toFixed(6) : '-'} />
                  <FormField label="Longitude" value={data.longitude ? parseFloat(data.longitude).toFixed(6) : '-'} />
                </Grid>
              </CardContent>
            </Card>

            {/* Map View using RouteMap */}
            {data.from_town && data.to_town && (
              <Box sx={{ mt: 1.5 }}>
                <RouteMap
                  fromCity={data.from_town}
                  toCity={data.to_town}
                  height={300}
                  title={`${data.from_town} → ${data.to_town}`}
                  subtitle={`🚛 ${data.desp_veh_no} | Currently at: ${data.location || 'En route'}`}
                  routeColor="#7e22ce"
                  currentLat={parseFloat(data.latitude)}
                  currentLng={parseFloat(data.longitude)}
                />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            background: '#7e22ce',
            color: 'white',
            fontWeight: 700,
            px: 3,
            py: 1,
            '&:hover': {
              background: '#6b21a8',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function FormField({ label, value, fullWidth = false }) {
  return (
    <Grid item xs={fullWidth ? 12 : 6}>
      <TextField
        label={label}
        value={value || '-'}
        fullWidth
        size="small"
        InputProps={{
          readOnly: true,
          sx: {
            background: '#ffffff',
            '& .MuiOutlinedInput-input': {
              color: '#1f2937',
              fontWeight: 600,
              fontSize: '13px',
              py: 1,
            },
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderColor: '#e9d5ff',
            '& fieldset': {
              borderColor: '#e9d5ff',
              borderWidth: '1px',
            },
            '&:hover fieldset': {
              borderColor: '#d8b4fe',
            },
          },
          '& .MuiInputLabel-root': {
            fontSize: '12px',
            fontWeight: 700,
            color: '#7e22ce',
            '&.Mui-focused': {
              color: '#7e22ce',
            },
          },
        }}
      />
    </Grid>
  );
}

export default VehicleTrackingModal;
